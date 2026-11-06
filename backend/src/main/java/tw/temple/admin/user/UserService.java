package tw.temple.admin.user;

import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.common.ApiException;

@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public List<User> list() {
        return users.findAllByOrderByIdAsc();
    }

    public User create(String username, String rawPassword, String displayName, Role role) {
        if (users.findByUsername(username).isPresent()) {
            throw ApiException.conflict("帳號已存在");
        }
        return users.save(new User(username, encoder.encode(rawPassword), displayName, role));
    }

    public User update(Long id, String displayName, Role role, boolean active, User actor) {
        User user = get(id);
        if (user.getId().equals(actor.getId()) && (!active || role != Role.ADMIN)) {
            throw ApiException.badRequest("不能停用或降級自己的帳號");
        }
        user.updateProfile(displayName, role, active);
        return users.save(user);
    }

    public void resetPassword(Long id, String rawPassword) {
        User user = get(id);
        user.changePassword(encoder.encode(rawPassword));
        users.save(user);
    }

    public User get(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("找不到使用者"));
    }
}
