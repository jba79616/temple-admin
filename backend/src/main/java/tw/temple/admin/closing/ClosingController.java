package tw.temple.admin.closing;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.closing.ClosingDtos.CloseRequest;
import tw.temple.admin.closing.ClosingDtos.ClosingView;
import tw.temple.admin.closing.ClosingDtos.DaySummary;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/closings")
public class ClosingController {

    private final ClosingService service;
    private final CurrentUser currentUser;

    public ClosingController(ClosingService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/summary")
    public DaySummary summary(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.summary(date);
    }

    @GetMapping
    public List<ClosingView> history() {
        return service.history();
    }

    @PostMapping
    public ClosingView close(@Valid @RequestBody CloseRequest req) {
        return ClosingView.of(service.close(req.closingDate(), req.countedCash(), req.note(), currentUser.get()));
    }
}
