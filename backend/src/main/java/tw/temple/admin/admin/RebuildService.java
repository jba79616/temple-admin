package tw.temple.admin.admin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        List<LightOrderItem> allItems = items.findAllByOrderByIdAsc();
        Map<Long, Integer> dueByOrder = new HashMap<>();
        Map<String, Expected> expected = new HashMap<>();
        for (LightOrderItem item : allItems) {
            LightOrder order = item.getOrder();
            if (!"作廢沖正".equals(item.getOverrideReason())) {
                dueByOrder.merge(order.getId(), item.getAction() == ItemAction.ADD ? item.getUnitPrice() : -item.getUnitPrice(), Integer::sum);
            }
            String key = item.getMember().getId() + ":" + item.getLightType().getId() + ":" + order.getYear();
            expected.put(key, new Expected(item.getAction() == ItemAction.ADD, item.getUnitPrice(), item));
        }

        List<String> dueMismatches = new ArrayList<>();
        List<LightOrder> allOrders = orders.findAll();
        for (LightOrder order : allOrders) {
            if (order.getStatus() != OrderStatus.ACTIVE) {
                continue;
            }
            int computed = dueByOrder.getOrDefault(order.getId(), 0);
            if (computed != order.getTotalDue()) {
                dueMismatches.add("單 #" + order.getId() + " 應收 " + order.getTotalDue() + "，明細重算 " + computed);
            }
        }

        List<String> recordMismatches = new ArrayList<>();
        List<AnnualLightRecord> allRecords = records.findAll();
        Map<String, AnnualLightRecord> byKey = new HashMap<>();
        for (AnnualLightRecord record : allRecords) {
            String key = record.getMember().getId() + ":" + record.getLightType().getId() + ":" + record.getYear();
            byKey.put(key, record);
            Expected exp = expected.get(key);
            if (exp == null) {
                recordMismatches.add("狀態表 " + key + " 沒有任何明細支持");
                continue;
            }
            if (exp.active() != record.isActive() || exp.unitPrice() != record.getUnitPrice()) {
                recordMismatches.add("狀態表 " + key + " active=" + record.isActive() + " price=" + record.getUnitPrice()
                    + "，明細重算 active=" + exp.active() + " price=" + exp.unitPrice());
                if (fix) {
                    if (exp.active()) {
                        record.activate(exp.unitPrice(), record.getHousehold(), exp.lastItem());
                    } else {
                        record.deactivate(exp.lastItem());
                    }
                    records.save(record);
                }
            }
        }
        for (Map.Entry<String, Expected> e : expected.entrySet()) {
            if (!byKey.containsKey(e.getKey())) {
                recordMismatches.add("明細 " + e.getKey() + " 在狀態表沒有紀錄");
                if (fix) {
                    LightOrderItem item = e.getValue().lastItem();
                    AnnualLightRecord created = new AnnualLightRecord(item.getOrder().getYear(), item.getMember(), item.getLightType(),
                        item.getMember().getHousehold(), e.getValue().unitPrice(), item);
                    if (!e.getValue().active()) {
                        created.deactivate(item);
                    }
                    records.save(created);
                }
            }
        }

        List<String> closingMismatches = new ArrayList<>();
        List<DailyClosing> allClosings = closings.findAll();
        for (DailyClosing closing : allClosings) {
            int computed = payments.sumByKindAndPostedOn(PaymentKind.CASH, closing.getClosingDate());
            if (computed != closing.getSystemCash()) {
                closingMismatches.add("日結 " + closing.getClosingDate() + " 系統合計 " + closing.getSystemCash() + "，收款重算 " + computed);
            }
        }
        return new Report(allOrders.size(), dueMismatches, allRecords.size(), recordMismatches, allClosings.size(), closingMismatches, fix);
    }
}
