package tw.temple.admin.light;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class LightTypeControllerTest {

    @Autowired MockMvc mvc;
    @Autowired LightTypeRepository lightTypes;

    private MockHttpSession session;

    @BeforeEach
    void login() throws Exception {
        session = (MockHttpSession) mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
            .andExpect(status().isOk())
            .andReturn().getRequest().getSession(false);
    }

    private static String lightTypeWithPrice(long price) {
        return """
            {"category":"GENERAL","name":"測試燈","shortName":"測","price":%d,"taisui":false,"sortOrder":2147483647}
            """.formatted(price);
    }

    @ParameterizedTest
    @ValueSource(longs = {-1, 1_000_001})
    void priceOutsideZeroToTheAmountLimitIsRejectedLikeOtherValidationErrors(long price) throws Exception {
        long before = lightTypes.count();

        mvc.perform(post("/api/light-types").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(lightTypeWithPrice(price)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("price ")));

        assertThat(lightTypes.count()).isEqualTo(before);
    }

    @Test
    void priceAtTheAmountLimitAndSortOrderAtTheIntBoundPassValidation() throws Exception {
        mvc.perform(put("/api/light-types/999999").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(lightTypeWithPrice(1_000_000)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("找不到燈種"));
    }

    @Test
    void sortOrderBeyondIntegerIsAValidationStyleBadRequest() throws Exception {
        mvc.perform(post("/api/light-types").session(session).contentType(MediaType.APPLICATION_JSON)
                .content(lightTypeWithPrice(300).replace("2147483647", "2147483648")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("sortOrder 格式錯誤或超出範圍"));
    }
}
