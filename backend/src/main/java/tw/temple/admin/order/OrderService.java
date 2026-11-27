package tw.temple.admin.order;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.OrderDtos.CreateCorrectionRequest;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderDtos.ItemView;
import tw.temple.admin.order.OrderDtos.OrderView;
import tw.temple.admin.order.OrderDtos.PaymentView;
import tw.temple.admin.systemconfig.ConfigService;
import tw.temple.admin.user.User;

@Service
@Transactional
public class OrderService {

    private final LightOrderRepository orders;
    private final LightOrderItemRepository items;
    private final PaymentRepository payments;
    private final AnnualLightRecordRepository records;
    private final HouseholdRepository households;
    private final MemberRepository members;
    private final LightTypeRepository lightTypes;
    private final DayClosingStatus closingStatus;
    private final ConfigService config;
    private final TempleClock clock;

    public OrderService(LightOrderRepository orders, LightOrderItemRepository items, PaymentRepository payments,
                        AnnualLightRecordRepository records, HouseholdRepository households, MemberRepository members,
                        LightTypeRepository lightTypes, DayClosingStatus closingStatus, ConfigService config, TempleClock clock) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.records = records;
        this.households = households;
        this.members = members;
        this.lightTypes = lightTypes;
        this.closingStatus = closingStatus;
        this.config = config;
        this.clock = clock;
    }

    public LightOrder createCounter(CreateOrderRequest req, User actor) {
        LocalDate today = clock.today();
        ensureOpenForPosting(today);
        Household household = households.findById(req.householdId()).orElseThrow(() -> ApiException.notFound("找不到戶"));
        LightOrder order = orders.save(new LightOrder(OrderKind.COUNTER, resolveYear(req.year()), household,
            resolvePastDate(req.registeredOn(), today, "登記日"), today, null, req.note(), actor));
        int due = applyItems(order, req.items(), actor, false);
        order.settleTotalDue(due);
        LocalDate receivedOn = resolvePastDate(req.receivedOn(), today, "收款日");
        if (due > 0) {
            payments.save(new Payment(order, PaymentKind.CASH, due, receivedOn, today, actor, null));
        } else if (due < 0) {
            payments.save(new Payment(order, PaymentKind.FORFEIT, due, receivedOn, today, actor, "取消不退費，轉功德金"));
        }
        return orders.save(order);
    }

    public LightOrder correctOrder(Long originalId, CreateCorrectionRequest req, User actor) {
        LightOrder original = get(originalId);
        if (!original.isActive()) {
            throw ApiException.badRequest("已作廢的單不能更正");
        }
        if (original.getKind() == OrderKind.IMPORT) {
            throw ApiException.badRequest("匯入單不能更正");
        }
        if (!actor.isAdmin()) {
            throw ApiException.forbidden("只有 ADMIN 可以開更正單");
        }
        LocalDate today = clock.today();
        ensureOpenForPosting(today);
        Long householdId = req.householdId() != null ? req.householdId() : original.getHousehold().getId();
        Household household = households.findById(householdId).orElseThrow(() -> ApiException.notFound("找不到戶"));
        LightOrder order = orders.save(new LightOrder(OrderKind.CORRECTION, original.getYear(), household,
            resolvePastDate(req.registeredOn(), today, "登記日"), today, original, req.reason(), actor));
        int due = applyItems(order, req.items(), actor, true);
        order.settleTotalDue(due);
        LocalDate receivedOn = resolvePastDate(req.receivedOn(), today, "收款日");
        switch (req.settlement()) {
            case CASH -> {
                if (due != 0) {
                    payments.save(new Payment(order, PaymentKind.CASH, due, receivedOn, today, actor, due < 0 ? "更正單退款" : "更正單補收"));
                }
            }
            case FORFEIT -> {
                if (due >= 0) {
                    throw ApiException.badRequest("只有應退款時才能選擇放棄退款");
                }
                payments.save(new Payment(order, PaymentKind.FORFEIT, due, receivedOn, today, actor, "放棄退款，轉功德金"));
            }
            case PENDING -> {
                // 留待處理
            }
        }
        return orders.save(order);
    }

    public LightOrder voidOrder(Long id, String reason, User actor) {
        if (!actor.isAdmin()) {
            throw ApiException.forbidden("只有 ADMIN 可以作廢");
        }
        LightOrder order = get(id);
        if (!order.isActive()) {
            throw ApiException.badRequest("此單已作廢");
        }
        if (order.getKind() == OrderKind.IMPORT) {
            throw ApiException.badRequest("匯入單不能作廢");
        }
        if (isClosed(order.getPostedOn())) {
            throw ApiException.badRequest("入帳日已日結，不能作廢，請改開更正單");
        }
        LocalDate today = clock.today();
        ensureOpenForPosting(today);
        for (LightOrderItem item : items.findByOrderIdOrderByIdAsc(id)) {
            AnnualLightRecord record = records.findByMemberIdAndLightTypeIdAndYear(item.getMember().getId(),
                item.getLightType().getId(), order.getYear()).orElseThrow(() -> ApiException.conflict("狀態表缺少對應紀錄"));
            LightOrderItem last = record.getLastOrderItem();
            if (last == null || !last.getOrder().getId().equals(id)) {
                throw ApiException.badRequest(item.getMember().getName() + " 的 " + item.getLightType().getName()
                    + " 已被後續單據異動，不能作廢，請改開更正單");
            }
            int reversedPrice = item.getAction() == ItemAction.REMOVE ? record.getUnitPrice() : item.getUnitPrice();
            LightOrderItem reversed = items.save(new LightOrderItem(order, item.getMember(), item.getLightType(),
                item.getAction().reversed(), reversedPrice, LightOrderItem.REVERSAL_REASON));
            applyToRecord(reversed, order);
        }
        for (Payment payment : payments.findByOrderIdOrderByIdAsc(id)) {
            payments.save(new Payment(order, payment.getKind(), -payment.getAmount(), today, today, actor,
                LightOrderItem.REVERSAL_REASON + " #" + payment.getId()));
        }
        order.markVoided(actor, clock.now(), reason.trim());
        return orders.save(order);
    }

    @Transactional(readOnly = true)
    public LightOrder get(Long id) {
        return orders.findById(id).orElseThrow(() -> ApiException.notFound("找不到單據"));
    }

    @Transactional(readOnly = true)
    public OrderView view(Long id) {
        return toView(get(id));
    }

    @Transactional(readOnly = true)
    public List<OrderView> byHousehold(Long householdId) {
        return orders.findByHouseholdIdOrderByIdDesc(householdId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderView> unsettled() {
        return orders.findUnsettled().stream().map(this::toView).toList();
    }

    private boolean isClosed(LocalDate date) {
        return closingStatus.isClosed(date);
    }

    private void ensureOpenForPosting(LocalDate today) {
        if (isClosed(today)) {
            throw ApiException.badRequest("今天已日結，不能再入帳；請明天再處理");
        }
    }

    private int resolveYear(Integer year) {
        int resolved = year == null ? config.currentYear() : year;
        if (resolved < 1990 || resolved > 2100) {
            throw ApiException.badRequest("年度必須是西元 1990 到 2100");
        }
        return resolved;
    }

    private LocalDate resolvePastDate(LocalDate date, LocalDate today, String label) {
        if (date == null) {
            return today;
        }
        if (date.isAfter(today)) {
            throw ApiException.badRequest(label + "不能晚於今天");
        }
        return date;
    }

    private int applyItems(LightOrder order, List<ItemInput> inputs, User actor, boolean allowCrossHousehold) {
        Set<String> seen = new HashSet<>();
        long due = 0;
        for (ItemInput input : inputs) {
            if (!seen.add(input.memberId() + ":" + input.lightTypeId())) {
                throw ApiException.badRequest("同一張單裡同一人同一燈種只能出現一次");
            }
            Member member = members.findById(input.memberId()).orElseThrow(() -> ApiException.notFound("找不到成員"));
            LightType lightType = lightTypes.findById(input.lightTypeId()).orElseThrow(() -> ApiException.notFound("找不到燈種"));
            if (!allowCrossHousehold && !member.getHousehold().getId().equals(order.getHousehold().getId())) {
                throw ApiException.badRequest(member.getName() + " 不是這一戶的成員");
            }
            if (input.action() == ItemAction.ADD) {
                if (member.isDeleted()) {
                    throw ApiException.badRequest(member.getName() + " 已刪除，不能安燈");
                }
                if (!lightType.isActive()) {
                    throw ApiException.badRequest(lightType.getName() + " 已停用");
                }
            }
            Optional<AnnualLightRecord> existing = records.findByMemberIdAndLightTypeIdAndYear(member.getId(), lightType.getId(), order.getYear());
            int defaultPrice = input.action() == ItemAction.ADD ? lightType.getPrice() : activeRecord(existing, member, lightType).getUnitPrice();
            int unitPrice = resolveUnitPrice(input, defaultPrice, actor);
            LightOrderItem item = items.save(new LightOrderItem(order, member, lightType, input.action(), unitPrice,
                unitPrice == defaultPrice ? null : input.overrideReason().trim()));
            applyToRecord(item, order, existing);
            due += input.action() == ItemAction.ADD ? unitPrice : -unitPrice;
        }
        return toIntDue(due);
    }

    /**
     * 品項數沒有上限，退費又沿用狀態表裡的舊單價，單價上限擋不住合計超出 INT 欄位。
     * 下界也排除 Integer.MIN_VALUE，作廢時對收款取負號才不會再溢位。
     */
    static int toIntDue(long due) {
        if (due < -Integer.MAX_VALUE || due > Integer.MAX_VALUE) {
            throw ApiException.badRequest("整張單的應收合計超出可記錄的範圍，請拆成多張單");
        }
        return (int) due;
    }

    private int resolveUnitPrice(ItemInput input, int defaultPrice, User actor) {
        if (input.unitPrice() == null || input.unitPrice() == defaultPrice) {
            return defaultPrice;
        }
        if (!actor.isAdmin()) {
            throw ApiException.forbidden("只有 ADMIN 可以改價");
        }
        if (input.unitPrice() < 0) {
            throw ApiException.badRequest("單價不可為負");
        }
        if (input.overrideReason() == null || input.overrideReason().isBlank()) {
            throw ApiException.badRequest("改價必須填原因");
        }
        return input.unitPrice();
    }

    private void applyToRecord(LightOrderItem item, LightOrder order) {
        applyToRecord(item, order, records.findByMemberIdAndLightTypeIdAndYear(item.getMember().getId(),
            item.getLightType().getId(), order.getYear()));
    }

    private void applyToRecord(LightOrderItem item, LightOrder order, Optional<AnnualLightRecord> existing) {
        Member member = item.getMember();
        LightType lightType = item.getLightType();
        switch (item.getAction()) {
            case ADD -> {
                if (existing.isPresent() && existing.get().isActive()) {
                    throw ApiException.conflict(member.getName() + " 的 " + lightType.getName() + " 今年已安");
                }
                if (existing.isPresent()) {
                    AnnualLightRecord record = existing.get();
                    record.activate(item.getUnitPrice(), member.getHousehold(), item);
                    records.save(record);
                } else {
                    records.save(new AnnualLightRecord(order.getYear(), member, lightType, member.getHousehold(), item.getUnitPrice(), item));
                }
            }
            case REMOVE -> {
                AnnualLightRecord record = activeRecord(existing, member, lightType);
                record.deactivate(item);
                records.save(record);
            }
        }
    }

    private AnnualLightRecord activeRecord(Optional<AnnualLightRecord> existing, Member member, LightType lightType) {
        return existing.filter(AnnualLightRecord::isActive)
            .orElseThrow(() -> ApiException.conflict(member.getName() + " 的 " + lightType.getName() + " 今年沒有安，無法取消"));
    }

    private OrderView toView(LightOrder order) {
        long paid = payments.sumByOrder(order.getId());
        List<ItemView> itemViews = items.findByOrderIdOrderByIdAsc(order.getId()).stream()
            .map(i -> new ItemView(i.getId(), i.getMember().getId(), i.getMember().getName(), i.getLightType().getId(),
                i.getLightType().getName(), i.getAction(), i.getUnitPrice(), i.getOverrideReason(), i.isReversal(), i.getCreatedAt()))
            .toList();
        List<PaymentView> paymentViews = payments.findByOrderIdOrderByIdAsc(order.getId()).stream()
            .map(p -> new PaymentView(p.getId(), p.getKind(), p.getAmount(), p.getReceivedOn(), p.getPostedOn(),
                p.getReceivedBy() == null ? null : p.getReceivedBy().getDisplayName(), p.getNote(), p.getCreatedAt()))
            .toList();
        List<Long> correctedBy = orders.findByCorrectsOrderIdOrderByIdAsc(order.getId()).stream().map(LightOrder::getId).toList();
        String headName = members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(order.getHousehold().getId())
            .map(Member::getName).orElse(null);
        return new OrderView(order.getId(), order.getKind(), order.getStatus(), order.getYear(), order.getHousehold().getId(),
            order.getHousehold().getHouseholdNumber(), headName, order.getRegisteredOn(), order.getPostedOn(), order.getTotalDue(),
            paid, order.getTotalDue() - paid, order.getCorrectsOrder() == null ? null : order.getCorrectsOrder().getId(), correctedBy,
            order.getNote(), order.getCreatedBy() == null ? null : order.getCreatedBy().getDisplayName(), order.getCreatedAt(),
            order.getVoidedBy() == null ? null : order.getVoidedBy().getDisplayName(), order.getVoidedAt(), order.getVoidReason(),
            isClosed(order.getPostedOn()), itemViews, paymentViews);
    }
}
