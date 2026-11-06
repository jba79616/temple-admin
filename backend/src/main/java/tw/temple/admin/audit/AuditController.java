package tw.temple.admin.audit;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    public record AuditView(Long id, String tableName, Long rowId, String action, String before, String after,
                            Long changedBy, OffsetDateTime changedAt) {
        static AuditView of(AuditLog a) {
            return new AuditView(a.getId(), a.getTableName(), a.getRowId(), a.getAction(), a.getBeforeData(),
                a.getAfterData(), a.getChangedBy(), a.getChangedAt());
        }
    }

    private final AuditLogRepository repo;

    public AuditController(AuditLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<AuditView> list(@RequestParam(required = false) String table,
                                @RequestParam(required = false) Long rowId,
                                @RequestParam(defaultValue = "100") int limit) {
        int size = Math.min(Math.max(limit, 1), 500);
        List<AuditLog> logs;
        if (table != null && rowId != null) {
            logs = repo.findByTableNameAndRowIdOrderByIdDesc(table, rowId);
        } else if (table != null) {
            logs = repo.findByTableNameOrderByIdDesc(table, PageRequest.of(0, size));
        } else {
            logs = repo.findAllByOrderByIdDesc(PageRequest.of(0, size));
        }
        return logs.stream().map(AuditView::of).toList();
    }
}
