package tw.temple.admin.registry;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.registry.RegistryDtos.HouseholdRow;
import tw.temple.admin.registry.RegistryDtos.MemberRow;
import tw.temple.admin.registry.RegistryDtos.PageView;

@RestController
@RequestMapping("/api/registry")
public class RegistryController {

    private final RegistryService service;

    public RegistryController(RegistryService service) {
        this.service = service;
    }

    @GetMapping("/members")
    public PageView<MemberRow> members(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
                                       @RequestParam(defaultValue = "false") boolean lit, @RequestParam(required = false) Integer year) {
        return service.members(page, size, lit, year);
    }

    @GetMapping("/households")
    public PageView<HouseholdRow> households(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
                                             @RequestParam(defaultValue = "false") boolean lit, @RequestParam(required = false) Integer year) {
        return service.households(page, size, lit, year);
    }
}
