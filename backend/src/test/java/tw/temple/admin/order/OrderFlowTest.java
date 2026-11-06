package tw.temple.admin.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.closing.ClosingService;
import tw.temple.admin.closing.DailyClosingRepository;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.household.Member;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.OrderDtos.CreateCorrectionRequest;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderDtos.OrderView;
import tw.temple.admin.user.Role;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;
import tw.temple.admin.user.UserService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class OrderFlowTest {

    @Autowired OrderService orderService;
    @Autowired HouseholdService householdService;
    @Autowired ClosingService closingService;
    @Autowired LightTypeRepository lightTypes;
    @Autowired AnnualLightRecordRepository records;
    @Autowired LightOrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired DailyClosingRepository closings;
    @Autowired UserRepository users;
    @Autowired UserService userService;

    User admin;
    User staff;
    LightType guangming;
    LightType wenchang;
    LightType taisui;
    LightType bagua1;
    Household household;
    Member a;
    Member b;

    @BeforeEach
    void setUp() {
        closings.deleteAll();
        admin = users.findByUsername("admin").orElseThrow();
        staff = users.findByUsername("staff").orElseGet(() -> userService.create("staff", "staff123", "志工", Role.STAFF));
        guangming = lightTypes.findByName("光明燈").orElseThrow();
        wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        taisui = lightTypes.findByName("太歲燈").orElseThrow();
        bagua1 = lightTypes.findByName("八卦斗 1").orElseThrow();
        household = householdService.create(new HouseholdInput("新北市", "三重區", "仁忠街1號", "02-0000", null, null,
            member("王大明", "辛亥")), admin);
        a = householdService.getMember(householdService.detail(household.getId(), null).members().get(0).id());
        b = householdService.addMember(household.getId(), member("王小花", "辛巳"), admin);
    }

    private static MemberInput member(String name, String ganzhi) {
        return new MemberInput(name, "M", null, null, null, null, ganzhi, 1, false, 9, null, null);
    }

    private ItemInput add(Member m, LightType t) {
        return new ItemInput(m.getId(), t.getId(), ItemAction.ADD, null, null);
    }

    private ItemInput remove(Member m, LightType t) {
        return new ItemInput(m.getId(), t.getId(), ItemAction.REMOVE, null, null);
    }

    private OrderView counter(User actor, ItemInput... items) {
        LightOrder order = orderService.createCounter(new CreateOrderRequest(null, household.getId(), null, null, null, List.of(items)), actor);
        return orderService.view(order.getId());
    }

    @Test
    void counterOrderChargesCashAndActivatesRecords() {
        OrderView view = counter(staff, add(a, guangming), add(b, taisui), add(b, bagua1));

        assertThat(view.totalDue()).isEqualTo(1100);
        assertThat(view.paid()).isEqualTo(1100);
        assertThat(view.balance()).isZero();
        assertThat(view.payments()).singleElement().satisfies(p -> {
            assertThat(p.kind()).isEqualTo(PaymentKind.CASH);
            assertThat(p.amount()).isEqualTo(1100);
        });
        assertThat(householdService.detail(household.getId(), null).records()).hasSize(3);
    }

    @Test
    void secondVisitNetsAddsAgainstRemoves() {
        counter(staff, add(a, guangming));
        OrderView swap = counter(staff, remove(a, guangming), add(a, wenchang));

        assertThat(swap.totalDue()).isZero();
        assertThat(swap.payments()).isEmpty();
        var recordViews = householdService.detail(household.getId(), null).records();
        assertThat(recordViews).singleElement().satisfies(r -> assertThat(r.lightTypeId()).isEqualTo(wenchang.getId()));
    }

    @Test
    void cancelOnlyIsSettledByForfeit() {
        counter(staff, add(a, guangming));
        OrderView cancel = counter(staff, remove(a, guangming));

        assertThat(cancel.totalDue()).isEqualTo(-300);
        assertThat(cancel.balance()).isZero();
        assertThat(cancel.payments()).singleElement().satisfies(p -> {
            assertThat(p.kind()).isEqualTo(PaymentKind.FORFEIT);
            assertThat(p.amount()).isEqualTo(-300);
        });
    }

    @Test
    void duplicateAddAndMissingRemoveAreRejected() {
        counter(staff, add(a, guangming));
        assertThatThrownBy(() -> counter(staff, add(a, guangming)))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.CONFLICT));
        assertThatThrownBy(() -> counter(staff, remove(b, guangming)))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("沒有安");
    }

    @Test
    void priceOverrideNeedsAdminAndReason() {
        ItemInput overridden = new ItemInput(a.getId(), guangming.getId(), ItemAction.ADD, 0, "同年取消後再加回");
        assertThatThrownBy(() -> counter(staff, overridden))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.FORBIDDEN));
        ItemInput noReason = new ItemInput(a.getId(), guangming.getId(), ItemAction.ADD, 0, " ");
        assertThatThrownBy(() -> counter(admin, noReason)).hasMessageContaining("原因");

        OrderView view = counter(admin, overridden);
        assertThat(view.totalDue()).isZero();
        assertThat(view.items().get(0).overrideReason()).isEqualTo("同年取消後再加回");
    }

    @Test
    void voidReversesItemsAndPayments() {
        OrderView view = counter(staff, add(a, guangming), add(b, wenchang));
        OrderView voided = orderService.view(orderService.voidOrder(view.id(), "打錯戶", admin).getId());

        assertThat(voided.status()).isEqualTo(OrderStatus.VOIDED);
        assertThat(voided.items()).hasSize(4);
        assertThat(voided.payments()).hasSize(2);
        assertThat(voided.paid()).isZero();
        assertThat(householdService.detail(household.getId(), null).records()).isEmpty();
        assertThatThrownBy(() -> orderService.voidOrder(view.id(), "再一次", admin)).hasMessageContaining("已作廢");
        assertThatThrownBy(() -> orderService.voidOrder(view.id(), "志工", staff))
            .satisfies(ex -> assertThat(((ApiException) ex).status()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void voidIsBlockedWhenLaterOrderTouchedSameLantern() {
        OrderView first = counter(staff, add(a, guangming));
        counter(staff, remove(a, guangming));
        assertThatThrownBy(() -> orderService.voidOrder(first.id(), "想作廢", admin)).hasMessageContaining("後續單據");
    }

    @Test
    void closedDayBlocksVoidButAllowsCorrection() {
        OrderView view = counter(staff, add(a, guangming));
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LightOrder order = orders.findById(view.id()).orElseThrow();
        order.backdatePostedOn(yesterday);
        orders.saveAndFlush(order);
        closingService.close(yesterday, 0, null, admin);

        assertThatThrownBy(() -> orderService.voidOrder(view.id(), "作廢", admin)).hasMessageContaining("已日結");

        CreateCorrectionRequest upgrade = new CreateCorrectionRequest(null, null, null, null, "打成光明燈，應為八卦斗",
            Settlement.CASH, List.of(remove(a, guangming), add(a, bagua1)));
        OrderView corrected = orderService.view(orderService.correctOrder(view.id(), upgrade, admin).getId());
        assertThat(corrected.kind()).isEqualTo(OrderKind.CORRECTION);
        assertThat(corrected.correctsOrderId()).isEqualTo(view.id());
        assertThat(corrected.totalDue()).isEqualTo(200);
        assertThat(corrected.payments()).singleElement().satisfies(p -> assertThat(p.amount()).isEqualTo(200));
        assertThat(orderService.view(view.id()).correctedByOrderIds()).containsExactly(corrected.id());

        CreateCorrectionRequest downgrade = new CreateCorrectionRequest(null, null, null, null, "改回光明燈",
            Settlement.FORFEIT, List.of(remove(a, bagua1), add(a, guangming)));
        OrderView down = orderService.view(orderService.correctOrder(view.id(), downgrade, admin).getId());
        assertThat(down.totalDue()).isEqualTo(-200);
        assertThat(down.payments()).singleElement().satisfies(p -> assertThat(p.kind()).isEqualTo(PaymentKind.FORFEIT));

        CreateCorrectionRequest pending = new CreateCorrectionRequest(null, null, null, null, "補文昌燈，先不收",
            Settlement.PENDING, List.of(add(a, wenchang)));
        OrderView pend = orderService.view(orderService.correctOrder(view.id(), pending, admin).getId());
        assertThat(pend.balance()).isEqualTo(300);
        assertThat(orderService.unsettled()).extracting(OrderView::id).contains(pend.id());
    }

    @Test
    void closingTodayFreezesPostings() {
        OrderView view = counter(staff, add(a, guangming));
        var summary = closingService.summary(null);
        assertThat(summary.systemCash()).isGreaterThanOrEqualTo(300);
        assertThat(summary.payments()).extracting(p -> p.orderId()).contains(view.id());

        var closing = closingService.close(null, summary.systemCash() + 200, "多 200", admin);
        assertThat(closing.getDifference()).isEqualTo(200);
        assertThat(closingService.summary(null).closed()).isTrue();

        assertThatThrownBy(() -> counter(staff, add(b, guangming))).hasMessageContaining("已日結");
        assertThatThrownBy(() -> orderService.voidOrder(view.id(), "作廢", admin)).hasMessageContaining("已日結");
        assertThatThrownBy(() -> closingService.close(null, 0, null, admin)).hasMessageContaining("已日結");
    }
}
