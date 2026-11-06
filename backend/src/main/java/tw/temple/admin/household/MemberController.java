package tw.temple.admin.household;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.household.HouseholdDtos.DeleteMemberRequest;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.household.HouseholdDtos.MoveMemberRequest;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final HouseholdService service;
    private final CurrentUser currentUser;

    public MemberController(HouseholdService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/{id}")
    public MemberView get(@PathVariable Long id) {
        return service.memberView(id);
    }

    @PutMapping("/{id}")
    public MemberView update(@PathVariable Long id, @Valid @RequestBody MemberInput input) {
        service.updateMember(id, input, currentUser.get());
        return service.memberView(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @Valid @RequestBody DeleteMemberRequest req) {
        service.deleteMember(id, req.reason(), req.newHeadId(), currentUser.get());
    }

    @PostMapping("/{id}/head")
    public MemberView setHead(@PathVariable Long id) {
        service.setHead(id, currentUser.get());
        return service.memberView(id);
    }

    @PostMapping("/{id}/move")
    public MemberView move(@PathVariable Long id, @Valid @RequestBody MoveMemberRequest req) {
        service.moveMember(id, req.householdId(), currentUser.get());
        return service.memberView(id);
    }
}
