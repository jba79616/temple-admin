package tw.temple.admin.admin;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.closing.DailyClosing;
import tw.temple.admin.closing.DailyClosingRepository;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.LightOrderItem;
import tw.temple.admin.order.LightOrderItemRepository;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.order.OrderStatus;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;

/** 從明細與收款重算狀態表、應收與日結合計，核對三者是否一致；fix 為 true 時修正狀態表。 */
@Service
@Transactional
public class RebuildService {

    public record Report(int ordersChecked, List<String> totalDueMismatches, int recordsChecked, List<String> recordMismatches,
                         int closingsChecked, List<String> closingMismatches, boolean fixed) {
    }

    private record Expected(boolean active, int unitPrice, LightOrderItem lastItem) {
    }

    private record Replay(Map<Long, Integer> dueByOrder, Map<String, Expected> expected) {
    }

    private final LightOrderRepository orders;
    private final LightOrderItemRepository items;
    private final PaymentRepository payments;
    private final AnnualLightRecordRepository records;
    private final DailyClosingRepository closings;

    public RebuildService(LightOrderRepository orders, LightOrderItemRepository items, PaymentRepository payments,
                          AnnualLightRecordRepository records, DailyClosingRepository closings) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.records = records;
        this.closings = closings;
    }

    public Report run(boolean fix) {
        Replay replay = replayItems(items.findAllByOrderByIdAsc());
        List<LightOrder> allOrders = orders.findAll();
        List<AnnualLightRecord> allRecords = records.findAll();
        List<DailyClosing> allClosings = closings.findAllByOrderByClosingDateAsc();
        List<String> recordMismatches = new ArrayList<>(checkRecords(allRecords, replay.expected(), fix));
        recordMismatches.addAll(checkMissingRecords(allRecords, replay.expected(), fix));
        return new Report(allOrders.size(), checkTotalDue(allOrders, replay.dueByOrder()), allRecords.size(), recordMismatches,
            allClosings.size(), checkClosings(allClosings), fix);
    }

    private Replay replayItems(List<LightOrderItem> allItems) {
        Map<Long, Integer> dueByOrder = new HashMap<>();
        Map<String, Expected> expected = new HashMap<>();
        for (LightOrderItem item : allItems) {
            LightOrder order = item.getOrder();
            if (!item.isReversal()) {
                dueByOrder.merge(order.getId(), signedPrice(item), Integer::sum);
            }
            String key = key(item.getMember().getId(), item.getLightType().getId(), order.getYear());
            Expected previous = expected.get(key);
            int recordPrice = item.getAction() == ItemAction.REMOVE && previous != null ? previous.unitPrice() : item.getUnitPrice();
            expected.put(key, new Expected(item.getAction() == ItemAction.ADD, recordPrice, item));
        }
        return new Replay(dueByOrder, expected);
    }

    private int signedPrice(LightOrderItem item) {
        return item.getAction() == ItemAction.ADD ? item.getUnitPrice() : -item.getUnitPrice();
    }

    private String key(Long memberId, Long lightTypeId, int year) {
        return memberId + ":" + lightTypeId + ":" + year;
    }

    private String keyOf(AnnualLightRecord record) {
        return key(record.getMember().getId(), record.getLightType().getId(), record.getYear());
    }

    private List<String> checkTotalDue(List<LightOrder> allOrders, Map<Long, Integer> dueByOrder) {
        List<String> mismatches = new ArrayList<>();
        for (LightOrder order : allOrders) {
            if (order.getStatus() != OrderStatus.ACTIVE) {
                continue;
            }
            int computed = dueByOrder.getOrDefault(order.getId(), 0);
            if (computed != order.getTotalDue()) {
                mismatches.add("單 #" + order.getId() + " 應收 " + order.getTotalDue() + "，明細重算 " + computed);
            }
        }
        return mismatches;
    }

    private List<String> checkRecords(List<AnnualLightRecord> allRecords, Map<String, Expected> expected, boolean fix) {
        List<String> mismatches = new ArrayList<>();
        for (AnnualLightRecord record : allRecords) {
            String key = keyOf(record);
            Expected exp = expected.get(key);
            if (exp == null) {
                mismatches.add("狀態表 " + key + " 沒有任何明細支持");
            } else if (exp.active() != record.isActive() || exp.unitPrice() != record.getUnitPrice()) {
                mismatches.add("狀態表 " + key + " active=" + record.isActive() + " price=" + record.getUnitPrice()
                    + "，明細重算 active=" + exp.active() + " price=" + exp.unitPrice());
                if (fix) {
                    repair(record, exp);
                }
            }
        }
        return mismatches;
    }

    private void repair(AnnualLightRecord record, Expected exp) {
        if (exp.active()) {
            record.activate(exp.unitPrice(), record.getHousehold(), exp.lastItem());
        } else {
            record.deactivate(exp.lastItem());
        }
        records.save(record);
    }

    private List<String> checkMissingRecords(List<AnnualLightRecord> allRecords, Map<String, Expected> expected, boolean fix) {
        Set<String> existing = allRecords.stream().map(this::keyOf).collect(Collectors.toSet());
        List<String> mismatches = new ArrayList<>();
        for (Map.Entry<String, Expected> e : expected.entrySet()) {
            if (!existing.contains(e.getKey())) {
                mismatches.add("明細 " + e.getKey() + " 在狀態表沒有紀錄");
                if (fix) {
                    recreate(e.getValue());
                }
            }
        }
        return mismatches;
    }

    private void recreate(Expected exp) {
        LightOrderItem item = exp.lastItem();
        AnnualLightRecord created = new AnnualLightRecord(item.getOrder().getYear(), item.getMember(), item.getLightType(),
            item.getMember().getHousehold(), exp.unitPrice(), item);
        if (!exp.active()) {
            created.deactivate(item);
        }
        records.save(created);
    }

    private List<String> checkClosings(List<DailyClosing> allClosings) {
        List<String> mismatches = new ArrayList<>();
        LocalDate after = null;
        for (DailyClosing closing : allClosings) {
            int computed = payments.sumByKindPostedBetween(PaymentKind.CASH, after, closing.getClosingDate());
            if (computed != closing.getSystemCash()) {
                mismatches.add("日結 " + closing.getClosingDate() + " 系統合計 " + closing.getSystemCash() + "，收款重算 " + computed);
            }
            after = closing.getClosingDate();
        }
        return mismatches;
    }
}
