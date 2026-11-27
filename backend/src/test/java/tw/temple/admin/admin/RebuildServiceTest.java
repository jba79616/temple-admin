package tw.temple.admin.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.admin.RebuildService.Report;
import tw.temple.admin.closing.ClosingService;
import tw.temple.admin.closing.DailyClosingRepository;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.household.Member;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.LightOrderItem;
import tw.temple.admin.order.LightOrderItemRepository;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderService;
import tw.temple.admin.order.Payment;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RebuildServiceTest {

    @Autowired RebuildService rebuildService;
    @Autowired OrderService orderService;
    @Autowired HouseholdService householdService;
    @Autowired ClosingService closingService;
    @Autowired LightTypeRepository lightTypes;
    @Autowired AnnualLightRecordRepository records;
    @Autowired LightOrderRepository orders;
    @Autowired LightOrderItemRepository items;
    @Autowired PaymentRepository payments;
    @Autowired DailyClosingRepository closings;
    @Autowired UserRepository users;
    @Autowired TempleClock clock;

    User admin;
    LightType guangming;
    LightType taisui;
    Household household;
    Member a;
    Member b;

    @BeforeEach
    void setUp() {
        closings.deleteAll();
        admin = users.findByUsername("admin").orElseThrow();
        guangming = lightTypes.findByName("光明燈").orElseThrow();
        taisui = lightTypes.findByName("太歲燈").orElseThrow();
        household = householdService.create(new HouseholdInput("臺北市", "大同區", "重建路1號", null, null, null,
            member("陳重建")), admin);
        a = householdService.getMember(householdService.detail(household.getId(), null).members().get(0).id());
        b = householdService.addMember(household.getId(), member("陳核對"), admin);
    }

    @AfterEach
    void tearDown() {
        closings.deleteAll();
    }

    private static MemberInput member(String name) {
        return new MemberInput(name, "F", null, null, null, null, null, null, null, null, null, null);
    }

    private LightOrder counter(ItemAction action, Member m, LightType t) {
        ItemInput item = new ItemInput(m.getId(), t.getId(), action, null, null);
        return orderService.createCounter(new CreateOrderRequest(null, household.getId(), null, null, null, List.of(item)), admin);
    }

    private AnnualLightRecord record(Member m, LightType t, int year) {
        return records.findByMemberIdAndLightTypeIdAndYear(m.getId(), t.getId(), year).orElseThrow();
    }

    private static String key(Member m, LightType t, int year) {
        return m.getId() + ":" + t.getId() + ":" + year;
    }

    @Test
    void consistentDataProducesNoMismatchesForIt() {
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        String recordKey = key(a, guangming, order.getYear());

        Report report = rebuildService.run(false);

        assertThat(report.fixed()).isFalse();
        assertThat(report.ordersChecked()).isEqualTo((int) orders.count());
        assertThat(report.recordsChecked()).isEqualTo((int) records.count());
        assertThat(report.closingsChecked()).isZero();
        assertThat(report.totalDueMismatches()).noneMatch(line -> line.startsWith("單 #" + order.getId() + " "));
        assertThat(report.recordMismatches()).noneMatch(line -> line.contains(" " + recordKey + " "));
        assertThat(report.closingMismatches()).isEmpty();
    }

    @Test
    void totalDueMismatchIsReportedForActiveOrdersOnly() {
        LightOrder active = counter(ItemAction.ADD, a, guangming);
        LightOrder tampered = orders.findById(active.getId()).orElseThrow();
        tampered.settleTotalDue(999);
        orders.saveAndFlush(tampered);

        LightOrder voided = counter(ItemAction.ADD, b, guangming);
        LightOrder voidedTampered = orders.findById(voided.getId()).orElseThrow();
        voidedTampered.settleTotalDue(777);
        orders.saveAndFlush(voidedTampered);
        orderService.voidOrder(voided.getId(), "打錯", admin);

        List<String> mismatches = rebuildService.run(false).totalDueMismatches();

        assertThat(mismatches).contains("單 #" + active.getId() + " 應收 999，明細重算 300");
        assertThat(mismatches).noneMatch(line -> line.startsWith("單 #" + voided.getId() + " "));
    }

    @Test
    void recordMismatchIsReportedAndFixedOnlyWhenAsked() {
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        AnnualLightRecord record = record(a, guangming, order.getYear());
        LightOrderItem lastItem = record.getLastOrderItem();
        record.deactivate(lastItem);
        records.saveAndFlush(record);
        String recordKey = key(a, guangming, order.getYear());

        Report dryRun = rebuildService.run(false);

        assertThat(dryRun.recordMismatches())
            .contains("狀態表 " + recordKey + " active=false price=300，明細重算 active=true price=300");
        assertThat(record(a, guangming, order.getYear()).isActive()).isFalse();

        Report fixed = rebuildService.run(true);

        assertThat(fixed.fixed()).isTrue();
        assertThat(fixed.recordMismatches()).anyMatch(line -> line.startsWith("狀態表 " + recordKey + " active=false"));
        AnnualLightRecord repaired = record(a, guangming, order.getYear());
        assertThat(repaired.isActive()).isTrue();
        assertThat(repaired.getUnitPrice()).isEqualTo(300);
        assertThat(repaired.getLastOrderItem().getId()).isEqualTo(lastItem.getId());
        assertThat(rebuildService.run(false).recordMismatches()).noneMatch(line -> line.contains(" " + recordKey + " "));
    }

    @Test
    void priceMismatchIsFixedBackToThePricePaid() {
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        AnnualLightRecord record = record(a, guangming, order.getYear());
        record.activate(123, household, record.getLastOrderItem());
        records.saveAndFlush(record);
        String recordKey = key(a, guangming, order.getYear());

        assertThat(rebuildService.run(true).recordMismatches())
            .contains("狀態表 " + recordKey + " active=true price=123，明細重算 active=true price=300");
        assertThat(record(a, guangming, order.getYear()).getUnitPrice()).isEqualTo(300);
    }

    @Test
    void recordWithoutAnyItemIsReportedButLeftAlone() {
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        LightOrderItem someoneElsesItem = record(a, guangming, order.getYear()).getLastOrderItem();
        AnnualLightRecord orphan = records.saveAndFlush(
            new AnnualLightRecord(order.getYear(), b, taisui, household, 500, someoneElsesItem));
        String orphanKey = key(b, taisui, order.getYear());

        try {
            assertThat(rebuildService.run(true).recordMismatches()).contains("狀態表 " + orphanKey + " 沒有任何明細支持");
            AnnualLightRecord untouched = records.findById(orphan.getId()).orElseThrow();
            assertThat(untouched.isActive()).isTrue();
            assertThat(untouched.getUnitPrice()).isEqualTo(500);
        } finally {
            records.deleteById(orphan.getId());
        }
    }

    @Test
    void missingActiveRecordIsReportedAndRecreatedOnFix() {
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        AnnualLightRecord record = record(a, guangming, order.getYear());
        Long itemId = record.getLastOrderItem().getId();
        records.delete(record);
        String recordKey = key(a, guangming, order.getYear());

        assertThat(rebuildService.run(false).recordMismatches()).contains("明細 " + recordKey + " 在狀態表沒有紀錄");
        assertThat(records.findByMemberIdAndLightTypeIdAndYear(a.getId(), guangming.getId(), order.getYear())).isEmpty();

        rebuildService.run(true);

        AnnualLightRecord recreated = record(a, guangming, order.getYear());
        assertThat(recreated.isActive()).isTrue();
        assertThat(recreated.getUnitPrice()).isEqualTo(300);
        assertThat(recreated.getHousehold().getId()).isEqualTo(household.getId());
        assertThat(recreated.getLastOrderItem().getId()).isEqualTo(itemId);
    }

    @Test
    void missingInactiveRecordIsRecreatedInactiveWithThePricePaid() {
        counter(ItemAction.ADD, a, guangming);
        LightOrder cancel = counter(ItemAction.REMOVE, a, guangming);
        AnnualLightRecord record = record(a, guangming, cancel.getYear());
        Long removeItemId = record.getLastOrderItem().getId();
        records.delete(record);

        rebuildService.run(true);

        AnnualLightRecord recreated = record(a, guangming, cancel.getYear());
        assertThat(recreated.isActive()).isFalse();
        assertThat(recreated.getUnitPrice()).isEqualTo(300);
        assertThat(recreated.getLastOrderItem().getId()).isEqualTo(removeItemId);
        assertThat(items.findById(removeItemId).orElseThrow().getAction()).isEqualTo(ItemAction.REMOVE);
    }

    @Test
    void closingMismatchComparesEachClosingWithCashSinceThePreviousOne() {
        LocalDate today = clock.today();
        LightOrder order = counter(ItemAction.ADD, a, guangming);
        LocalDate first = today.minusDays(20);
        LocalDate second = today.minusDays(10);
        closingService.close(first, 0, null, admin);
        int secondSystemCash = closingService.close(second, 0, null, admin).getSystemCash();
        payments.save(new Payment(order, PaymentKind.CASH, 100, second, second, admin, "日結後補登"));
        payments.save(new Payment(order, PaymentKind.FORFEIT, -40, second, second, admin, "不算現金"));

        Report report = rebuildService.run(false);

        assertThat(report.closingsChecked()).isEqualTo(2);
        assertThat(report.closingMismatches())
            .containsExactly("日結 " + second + " 系統合計 " + secondSystemCash + "，收款重算 " + (secondSystemCash + 100));
    }
}
