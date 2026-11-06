package tw.temple.admin.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {
    }

    public record Me(Long id, String username, String displayName, Role role) {
        public static Me of(User u) {
            return new Me(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole());
        }
    }

    public record UserView(Long id, String username, String displayName, Role role, boolean active) {
        public static UserView of(User u) {
            return new UserView(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole(), u.isActive());
        }
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record CreateUser(@NotBlank @Size(max = 50) String username, @NotBlank @Size(min = 6) String password,
                             @NotBlank @Size(max = 50) String displayName, @NotNull Role role) {
    }

    public record UpdateUser(@NotBlank @Size(max = 50) String displayName, @NotNull Role role, @NotNull Boolean active) {
    }

    public record ResetPassword(@NotBlank @Size(min = 6) String password) {
    }
}
