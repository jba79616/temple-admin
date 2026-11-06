package tw.temple.admin.systemconfig;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.calendar.Taisui;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/configs")
public class ConfigController {

    public record ConfigView(String key, String value, String description) {
        static ConfigView of(SystemConfig c) {
            return new ConfigView(c.getKey(), c.getValue(), c.getDescription());
        }
    }

    public record UpdateConfig(@NotNull String value) {
    }

    public record TaisuiView(int year, int rocYear, String ganzhi, String yearBranch, Set<String> enabled,
                             Map<String, String> flaggedBranches) {
    }

    private final ConfigService service;
    private final CurrentUser currentUser;

    public ConfigController(ConfigService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ConfigView> all() {
        return service.all().stream().map(ConfigView::of).toList();
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ConfigView update(@PathVariable String key, @Valid @RequestBody UpdateConfig req) {
        return ConfigView.of(service.update(key, req.value(), currentUser.get()));
    }

    @GetMapping("/taisui")
    public TaisuiView taisui(@RequestParam(required = false) Integer year) {
        int y = year == null ? service.currentYear() : year;
        Set<String> enabled = service.taisuiRelations();
        char branch = Ganzhi.branchOfYear(y);
        Map<String, String> flagged = new LinkedHashMap<>();
        Taisui.relationsFor(branch, enabled).forEach((b, rel) -> flagged.put(String.valueOf(b), rel));
        return new TaisuiView(y, Ganzhi.roc(y), Ganzhi.ofYear(y), String.valueOf(branch), enabled, flagged);
    }
}
