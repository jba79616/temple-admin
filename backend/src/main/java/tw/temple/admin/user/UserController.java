package tw.temple.admin.user;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService service;
    private final CurrentUser currentUser;

    public UserController(UserService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<UserDtos.UserView> list() {
        return service.list().stream().map(UserDtos.UserView::of).toList();
    }

    @PostMapping
    public UserDtos.UserView create(@Valid @RequestBody UserDtos.CreateUser req) {
        return UserDtos.UserView.of(service.create(req.username(), req.password(), req.displayName(), req.role()));
    }

    @PutMapping("/{id}")
    public UserDtos.UserView update(@PathVariable Long id, @Valid @RequestBody UserDtos.UpdateUser req) {
        return UserDtos.UserView.of(service.update(id, req.displayName(), req.role(), req.active(), currentUser.get()));
    }

    @PostMapping("/{id}/password")
    public void resetPassword(@PathVariable Long id, @Valid @RequestBody UserDtos.ResetPassword req) {
        service.resetPassword(id, req.password());
    }
}
