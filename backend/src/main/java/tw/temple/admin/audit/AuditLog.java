package tw.temple.admin.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "table_name", nullable = false, length = 40)
    private String tableName;

    @Column(name = "row_id", nullable = false)
    private Long rowId;

    @Column(nullable = false, length = 10)
    private String action;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_data")
    private String beforeData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_data")
    private String afterData;

    @Column(name = "changed_by")
    private Long changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private OffsetDateTime changedAt;

    protected AuditLog() {
    }

    public AuditLog(String tableName, Long rowId, String action, String beforeData, String afterData, Long changedBy) {
        this.tableName = tableName;
        this.rowId = rowId;
        this.action = action;
        this.beforeData = beforeData;
        this.afterData = afterData;
        this.changedBy = changedBy;
    }

    public Long getId() {
        return id;
    }

    public String getTableName() {
        return tableName;
    }

    public Long getRowId() {
        return rowId;
    }

    public String getAction() {
        return action;
    }

    public String getBeforeData() {
        return beforeData;
    }

    public String getAfterData() {
        return afterData;
    }

    public Long getChangedBy() {
        return changedBy;
    }

    public OffsetDateTime getChangedAt() {
        return changedAt;
    }
}
