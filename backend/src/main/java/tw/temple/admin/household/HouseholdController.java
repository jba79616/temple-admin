package tw.temple.admin.household;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.household.HouseholdDtos.HouseholdDetail;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.HouseholdSummary;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/households")
public class HouseholdController {

    private final HouseholdService service;
    private final CurrentUser currentUser;

    public HouseholdController(HouseholdService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<HouseholdSummary> search(@RequestParam(defaultValue = "") String q) {
        return service.search(q);
    }

    @GetMapping("/{id}")
    public HouseholdDetail detail(@PathVariable Long id, @RequestParam(required = false) Integer year) {
        return service.detail(id, year);
    }

    @PostMapping
    public HouseholdDetail create(@Valid @RequestBody HouseholdInput input) {
        Household created = service.create(input, currentUser.get());
        return service.detail(created.getId(), null);
    }

    @PutMapping("/{id}")
    public HouseholdDetail update(@PathVariable Long id, @Valid @RequestBody HouseholdInput input) {
        service.update(id, input, currentUser.get());
        return service.detail(id, null);
    }

    @PostMapping("/{id}/members")
    public MemberView addMember(@PathVariable Long id, @Valid @RequestBody MemberInput input) {
        Member member = service.addMember(id, input, currentUser.get());
        return service.memberView(member.getId());
    }
}
