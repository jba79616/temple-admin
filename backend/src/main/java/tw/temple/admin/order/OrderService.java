package tw.temple.admin.order;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.closing.DailyClosingRepository;
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
    private final DailyClosingRepository closings;
    private final ConfigService config;
    private final TempleClock clock;

    public OrderService(LightOrderRepository orders, LightOrderItemRepository items, PaymentRepository payments,
                        AnnualLightRecordRepository records, HouseholdRepository households, MemberRepository members,
                        LightTypeRepository lightTypes, DailyClosingRepository closings, ConfigService config, TempleClock clock) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.records = records;
        this.households = households;
        this.members = members;
        this.lightTypes = lightTypes;
        this.closings = closings;
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

    public LightOrder createCorrection(CreateCorrectionRequest req, User actor) {
        if (!actor.isAdmin()) {
            throw ApiException.forbidden("只有 ADMIN 可以開更正單");
        }
        LocalDate today = clock.today();
        ensureOpenForPosting(today);
        Household household = households.findById(req.householdId()).orElseThrow(() -> ApiException.notFound("找不到戶"));
        LightOrder order = orders.save(new LightOrder(OrderKind.CORRECTION, resolveYear(req.year()), household,
            resolvePastDate(req.registeredOn(), today, "登記日"), today, null, req.reason(), actor));
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
                // 留待處理：不產生收款，單據列入差額待處理
            }
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
        List<LightOrderItem> originalItems = items.findByOrderIdOrderByIdAsc(id);
        for (LightOrderItem item : originalItems) {
            AnnualLightRecord record = records.findByMemberIdAndLightTypeIdAndYear(item.getMember().getId(),
                item.getLightType().getId(), order.getYear()).orElseThrow(() -> ApiException.conflict("狀態表缺少對應紀錄"));
            LightOrderItem last = record.getLastOrderItem();
            if (last == null || !last.getOrder().getId().equals(id)) {
                throw ApiException.badRequest(item.getMember().getName() + " 的 " + item.getLightType().getName()
                    + " 已被後續單據異動，不能作廢，請改開更正單");
            }
        }
        for (LightOrderItem item : originalItems) {
            LightOrderItem reversed = items.save(new LightOrderItem(order, item.getMember(), item.getLightType(),
                item.getAction().reversed(), item.getUnitPrice(), "作廢沖正"));
            applyToRecord(reversed, order);
        }
        for (Payment payment : payments.findByOrderIdOrderByIdAsc(id)) {
            payments.save(new Payment(order, payment.getKind(), -payment.getAmount(), today, today, actor, "作廢沖正 #" + payment.getId()));
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

    @Transactional(readOnly = true)
    public boolean isClosed(LocalDate date) {
        return closedThrough().map(through -> !date.isAfter(through)).orElse(false);
    }

    @Transactional(readOnly = true)
    public Optional<LocalDate> closedThrough() {
        return closings.findTopByOrderByClosingDateDesc().map(c -> c.getClosingDate());
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
        int due = 0;
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
            int unitPrice = resolveUnitPrice(input, lightType, actor);
            LightOrderItem item = items.save(new LightOrderItem(order, member, lightType, input.action(), unitPrice,
                unitPrice == lightType.getPrice() ? null : input.overrideReason().trim()));
            applyToRecord(item, order);
            due += input.action() == ItemAction.ADD ? unitPrice : -unitPrice;
        }
        return due;
    }

    private int resolveUnitPrice(ItemInput input, LightType lightType, User actor) {
        if (input.unitPrice() == null || input.unitPrice() == lightType.getPrice()) {
            return lightType.getPrice();
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
        Member member = item.getMember();
        LightType lightType = item.getLightType();
        Optional<AnnualLightRecord> existing = records.findByMemberIdAndLightTypeIdAndYear(member.getId(), lightType.getId(), order.getYear());
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
                AnnualLightRecord record = existing.filter(AnnualLightRecord::isActive)
                    .orElseThrow(() -> ApiException.conflict(member.getName() + " 的 " + lightType.getName() + " 今年沒有安，無法取消"));
                record.deactivate(item);
                records.save(record);
            }
        }
    }

    private OrderView toView(LightOrder order) {
        int paid = payments.sumByOrder(order.getId());
        List<ItemView> itemViews = items.findByOrderIdOrderByIdAsc(order.getId()).stream()
            .map(i -> new ItemView(i.getId(), i.getMember().getId(), i.getMember().getName(), i.getLightType().getId(),
                i.getLightType().getName(), i.getAction(), i.getUnitPrice(), i.getOverrideReason(), i.getCreatedAt()))
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
