package tw.temple.admin.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired MockMvc mvc;
    @Autowired LightOrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired HouseholdService households;
    @Autowired UserRepository users;

    private MockHttpSession session;

    @BeforeEach
    void login() throws Exception {
        session = (MockHttpSession) mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
            .andExpect(status().isOk())
            .andReturn().getRequest().getSession(false);
    }

    private static String orderWithUnitPrice(long unitPrice) {
        return """
            {"householdId":999999,"items":[{"memberId":1,"lightTypeId":1,"action":"ADD","unitPrice":%d,"overrideReason":"補"}]}
            """.formatted(unitPrice);
    }

    @ParameterizedTest
    @ValueSource(longs = {-1, 1_000_001})
    void unitPriceOutsideZeroToTheAmountLimitIsRejectedLikeOtherValidationErrors(long unitPrice) throws Exception {
        long before = orders.count();

        mvc.perform(post("/api/orders").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(orderWithUnitPrice(unitPrice)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("items[0].unitPrice ")));

        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    void unitPriceAtTheAmountLimitPassesValidation() throws Exception {
        mvc.perform(post("/api/orders").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(orderWithUnitPrice(1_000_000)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("找不到戶"));
    }

    @Test
    void unitPriceBeyondIntegerNamesTheItemField() throws Exception {
        mvc.perform(post("/api/orders").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(orderWithUnitPrice(2_147_483_648L)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("items[0].unitPrice 格式錯誤或超出範圍"));
    }

    @Test
    @Transactional
    void paidAddsPaymentsBeyondIntegerWithoutOverflow() throws Exception {
        User admin = users.findByUsername("admin").orElseThrow();
        Household household = households.create(new HouseholdInput("新北市", "三重區", "仁忠街1號", null, null, null,
            new MemberInput("王大明", "M", null, null, null, null, "辛亥", 1, false, 9, null, null)), admin);
        LocalDate day = LocalDate.of(2001, 1, 3);
        LightOrder order = orders.save(new LightOrder(OrderKind.COUNTER, day.getYear(), household, day, day, null, null, admin));
        for (int i = 0; i < 3; i++) {
            payments.save(new Payment(order, PaymentKind.CASH, 1_000_000_000, day, day, admin, null));
        }

        mvc.perform(get("/api/orders/" + order.getId()).session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.paid").value(3_000_000_000L))
            .andExpect(jsonPath("$.balance").value(-3_000_000_000L));
    }
}
