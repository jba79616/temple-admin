package tw.temple.admin.audit;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByTableNameAndRowIdOrderByIdDesc(String tableName, Long rowId);

    List<AuditLog> findAllByOrderByIdDesc(Pageable pageable);

    List<AuditLog> findByTableNameOrderByIdDesc(String tableName, Pageable pageable);
}
