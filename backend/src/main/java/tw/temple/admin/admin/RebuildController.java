package tw.temple.admin.admin;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.admin.RebuildService.Report;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class RebuildController {

    private final RebuildService service;

    public RebuildController(RebuildService service) {
        this.service = service;
    }

    @PostMapping("/rebuild")
    public Report rebuild(@RequestParam(defaultValue = "false") boolean fix) {
        return service.run(fix);
    }
}
