package tw.temple.admin.mailing;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.mailing.MailingDtos.ActiveInput;
import tw.temple.admin.mailing.MailingDtos.MailingInput;
import tw.temple.admin.mailing.MailingDtos.MailingView;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/mailing")
public class MailingController {

    private final MailingService service;
    private final CurrentUser currentUser;

    public MailingController(MailingService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<MailingView> list(@RequestParam(required = false) Long householdId) {
        return service.list(householdId);
    }

    @PostMapping
    public MailingView create(@Valid @RequestBody MailingInput input) {
        return service.view(service.create(input, currentUser.get()).getId());
    }

    @PutMapping("/{id}")
    public MailingView update(@PathVariable Long id, @Valid @RequestBody MailingInput input) {
        return service.view(service.update(id, input, currentUser.get()).getId());
    }

    @PutMapping("/{id}/active")
    public MailingView setActive(@PathVariable Long id, @RequestBody ActiveInput input) {
        return service.view(service.setActive(id, input.active(), currentUser.get()).getId());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id, currentUser.get());
    }
}
