package tw.temple.admin.user;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** session 裡的身分是登入當下的快照；帳號被停用或改角色後，下一個 API 請求就要被踢出，而不是等 session 過期。 */
public class ActiveUserFilter extends OncePerRequestFilter {

    private final UserRepository users;

    public ActiveUserFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken || stillValid(auth)) {
            chain.doFilter(request, response);
            return;
        }
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"message\":\"帳號已停用或權限已變更，請重新登入\"}");
    }

    private boolean stillValid(Authentication auth) {
        return users.findByUsername(auth.getName())
            .filter(User::isActive)
            .filter(user -> hasRole(auth, user.getRole()))
            .isPresent();
    }

    private boolean hasRole(Authentication auth, Role role) {
        String expected = "ROLE_" + role.name();
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(expected::equals);
    }
}
