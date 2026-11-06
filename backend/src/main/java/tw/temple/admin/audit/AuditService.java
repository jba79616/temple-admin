package tw.temple.admin.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tw.temple.admin.user.User;

@Service
public class AuditService {

    private final AuditLogRepository repo;
    private final ObjectMapper mapper;

    public AuditService(AuditLogRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String table, Long rowId, String action, Object before, Object after, User actor) {
        repo.save(new AuditLog(table, rowId, action,
            before == null ? null : mapper.writeValueAsString(before),
            after == null ? null : mapper.writeValueAsString(after),
            actor == null ? null : actor.getId()));
    }
}
