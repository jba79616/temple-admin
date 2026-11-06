package tw.temple.admin.closing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import tw.temple.admin.user.User;

@Entity
@Table(name = "daily_closings")
public class DailyClosing {

    @Id
    @Column(name = "closing_date")
    private LocalDate closingDate;

    @Column(name = "system_cash", nullable = false)
    private int systemCash;

    @Column(name = "counted_cash", nullable = false)
    private int countedCash;

    @Generated
    @Column(insertable = false, updatable = false)
    private Integer difference;

    @ManyToOne(optional = false)
    @JoinColumn(name = "closed_by", nullable = false)
    private User closedBy;

    @CreationTimestamp
    @Column(name = "closed_at", nullable = false, updatable = false)
    private OffsetDateTime closedAt;

    @Column(length = 200)
    private String note;

    protected DailyClosing() {
    }

    public DailyClosing(LocalDate closingDate, int systemCash, int countedCash, User closedBy, String note) {
        this.closingDate = closingDate;
        this.systemCash = systemCash;
        this.countedCash = countedCash;
        this.closedBy = closedBy;
        this.note = note;
    }

    public LocalDate getClosingDate() {
        return closingDate;
    }

    public int getSystemCash() {
        return systemCash;
    }

    public int getCountedCash() {
        return countedCash;
    }

    public int getDifference() {
        return difference == null ? countedCash - systemCash : difference;
    }

    public User getClosedBy() {
        return closedBy;
    }

    public OffsetDateTime getClosedAt() {
        return closedAt;
    }

    public String getNote() {
        return note;
    }
}
