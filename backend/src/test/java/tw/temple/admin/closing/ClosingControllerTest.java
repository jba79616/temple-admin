package tw.temple.admin.closing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class ClosingControllerTest {

    @Autowired MockMvc mvc;
    @Autowired DailyClosingRepository closings;

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
    void countedCashAboveTheAmountLimitIsRejectedLikeOtherValidationErrors() throws Exception {
        long before = closings.count();

        mvc.perform(post("/api/closings").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":1000001}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("countedCash ")));

        assertThat(closings.count()).isEqualTo(before);
    }

    @Test
    void amendedCashAboveTheAmountLimitIsRejectedLikeOtherValidationErrors() throws Exception {
        mvc.perform(put("/api/closings/2026-11-27").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":1000001,\"reason\":\"打錯\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("countedCash ")));
    }

    @Test
    void amendedCashAtTheAmountLimitPassesValidation() throws Exception {
        mvc.perform(put("/api/closings/1999-01-01").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"countedCash\":1000000,\"reason\":\"打錯\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("找不到這一天的日結"));
    }
}
