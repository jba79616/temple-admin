package tw.temple.admin.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import tw.temple.admin.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired MockMvc mvc;
    @Autowired LightOrderRepository orders;

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
}
