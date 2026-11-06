package tw.temple.admin.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final UserRepository users;
    private final UserService userService;
    private final String username;
    private final String password;

    public AdminUserInitializer(UserRepository users, UserService userService,
                                @Value("${temple.admin.username:admin}") String username,
                                @Value("${temple.admin.password:admin123}") String password) {
        this.users = users;
        this.userService = userService;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() == 0) {
            userService.create(username, password, "管理員", Role.ADMIN);
            log.info("建立預設管理員帳號 {}，請登入後立即更改密碼", username);
        }
    }
}
