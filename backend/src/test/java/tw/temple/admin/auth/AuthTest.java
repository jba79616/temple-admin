package tw.temple.admin.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.user.Role;
import tw.temple.admin.user.UserRepository;
import tw.temple.admin.user.UserService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AuthTest {

    @Autowired MockMvc mvc;
    @Autowired UserService userService;
    @Autowired UserRepository users;

    @Test
    void apiRequiresLogin() throws Exception {
        mvc.perform(get("/api/households")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void loginEstablishesSessionAndRolesAreEnforced() throws Exception {
        MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("ADMIN"))
            .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

        mvc.perform(get("/api/households").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.username").value("admin"));
        mvc.perform(get("/api/users").session(session)).andExpect(status().isOk());

        if (users.findByUsername("staff2").isEmpty()) {
            userService.create("staff2", "staff123", "志工二", Role.STAFF);
        }
        MvcResult staffLogin = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"staff2\",\"password\":\"staff123\"}"))
            .andExpect(status().isOk()).andReturn();
        MockHttpSession staffSession = (MockHttpSession) staffLogin.getRequest().getSession(false);
        mvc.perform(get("/api/users").session(staffSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/light-types").session(staffSession)).andExpect(status().isOk());

        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isOk());
    }

    @Test
    void spaFallbackDoesNotHijackApi() throws Exception {
        mvc.perform(get("/api/does-not-exist")).andExpect(status().isUnauthorized());
    }
}
