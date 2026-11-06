package tw.temple.admin.light;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/light-types")
public class LightTypeController {

    public record LightTypeView(Long id, LightCategory category, String name, String shortName, int price, boolean taisui,
                                int sortOrder, boolean active, String legacyCode) {
        public static LightTypeView of(LightType t) {
            return new LightTypeView(t.getId(), t.getCategory(), t.getName(), t.getShortName(), t.getPrice(), t.isTaisui(),
                t.getSortOrder(), t.isActive(), t.getLegacyCode());
        }
    }

    public record LightTypeInput(@NotNull LightCategory category, @NotBlank @Size(max = 50) String name,
                                 @NotBlank @Size(max = 20) String shortName, @NotNull @Min(0) Integer price,
                                 boolean taisui, int sortOrder, Boolean active, @Size(max = 20) String legacyCode) {
        LightTypeFields toFields() {
            return new LightTypeFields(category, name.trim(), shortName.trim(), price, taisui, sortOrder,
                active == null || active, legacyCode == null || legacyCode.isBlank() ? null : legacyCode.trim());
        }
    }

    private final LightTypeService service;
    private final CurrentUser currentUser;

    public LightTypeController(LightTypeService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<LightTypeView> list(@RequestParam(defaultValue = "false") boolean all) {
        return (all ? service.all() : service.active()).stream().map(LightTypeView::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public LightTypeView create(@Valid @RequestBody LightTypeInput input) {
        return LightTypeView.of(service.create(input.toFields(), currentUser.get()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public LightTypeView update(@PathVariable Long id, @Valid @RequestBody LightTypeInput input) {
        return LightTypeView.of(service.update(id, input.toFields(), currentUser.get()));
    }
}
