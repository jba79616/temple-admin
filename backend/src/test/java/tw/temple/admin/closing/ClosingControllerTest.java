package tw.temple.admin.closing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.order.OrderKind;
import tw.temple.admin.order.Payment;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class ClosingControllerTest {

    private static final String DIFFERENCE_OUT_OF_RANGE = "實點與系統合計的差額超出可記錄的範圍，請確認實點金額";

    @Autowired MockMvc mvc;
    @Autowired DailyClosingRepository closings;
    @Autowired HouseholdService households;
    @Autowired LightOrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired UserRepository users;

    private MockHttpSession session;

    @BeforeEach
    void login() throws Exception {
        session = (MockHttpSession) mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
            .andExpect(status().isOk())
            .andReturn().getRequest().getSession(false);
    }

    @Test
    void negativeCountedCashIsRejectedLikeOtherValidationErrors() throws Exception {
        long before = closings.count();

        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":-1}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("countedCash ")));

        assertThat(closings.count()).isEqualTo(before);
    }

    @Test
    void negativeAmendedCashIsRejectedLikeOtherValidationErrors() throws Exception {
        mvc.perform(put("/api/closings/2026-11-27").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":-1,\"reason\":\"打錯\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("countedCash ")));
    }

    @Test
    @Transactional
    void countedCashIsAnAccumulatedTotalSoItMayExceedTheItemAmountLimit() throws Exception {
        closings.deleteAll();

        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":2147483647}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.countedCash").value(Integer.MAX_VALUE));
    }

    @Test
    void amendedCashUpToIntegerPassesValidation() throws Exception {
        mvc.perform(put("/api/closings/1999-01-01").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":2147483647,\"reason\":\"打錯\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("找不到這一天的日結"));
    }

    @Test
    @Transactional
    void closingWhoseDifferenceExceedsTheIntColumnIsABadRequest() throws Exception {
        closings.deleteAll();
        LocalDate day = LocalDate.of(2001, 1, 2);
        postCash(day, -1);
        long before = closings.count();

        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"closingDate\":\"" + day + "\",\"countedCash\":2147483647}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(DIFFERENCE_OUT_OF_RANGE));

        assertThat(closings.count()).isEqualTo(before);
    }

    @Test
    @Transactional
    void amendWhoseDifferenceExceedsTheIntColumnIsABadRequest() throws Exception {
        closings.deleteAll();
        LocalDate day = LocalDate.of(2001, 1, 2);
        closings.saveAndFlush(new DailyClosing(day, -1, 0, admin(), null));

        mvc.perform(put("/api/closings/" + day).session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":2147483647,\"reason\":\"打錯\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(DIFFERENCE_OUT_OF_RANGE));

        assertThat(closings.findById(day).orElseThrow().getCountedCash()).isZero();
    }

    @Test
    void countedCashBeyondIntegerIsAValidationStyleBadRequest() throws Exception {
        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":2147483648}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("countedCash 格式錯誤或超出範圍"));
    }

    @Test
    void malformedJsonIsAValidationStyleBadRequest() throws Exception {
        mvc.perform(put("/api/closings/2026-11-27").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("資料格式錯誤"));
        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("資料格式錯誤"));
    }

    private User admin() {
        return users.findByUsername("admin").orElseThrow();
    }

    private LightOrder orderPostedOn(LocalDate day) {
        Household household = households.create(new HouseholdInput("新北市", "三重區", "仁忠街1號", null, null, null,
            new MemberInput("王大明", "M", null, null, null, null, "辛亥", 1, false, 9, null, null)), admin());
        return orders.save(new LightOrder(OrderKind.COUNTER, day.getYear(), household, day, day, null, null, admin()));
    }

    private void postCash(LocalDate day, int... amounts) {
        LightOrder order = orderPostedOn(day);
        for (int amount : amounts) {
            payments.save(new Payment(order, PaymentKind.CASH, amount, day, day, admin(), null));
        }
    }
}
