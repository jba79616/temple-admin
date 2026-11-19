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
import org.hibernate.generator.EventType;
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

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
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

    @Column(name = "original_counted_cash")
    private Integer originalCountedCash;

    @Column(name = "amend_reason", length = 200)
    private String amendReason;

    @ManyToOne
    @JoinColumn(name = "amended_by")
    private User amendedBy;

    @Column(name = "amended_at")
    private OffsetDateTime amendedAt;

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

    /** 只改實點金額；系統合計是收款算出來的，不動。第一次修改才記原值，之後再改仍保留最初輸入的那筆。 */
    public void amend(int newCountedCash, String reason, User actor, OffsetDateTime at) {
        if (originalCountedCash == null) {
            originalCountedCash = countedCash;
        }
        countedCash = newCountedCash;
        amendReason = reason;
        amendedBy = actor;
        amendedAt = at;
    }

    public Integer getOriginalCountedCash() {
        return originalCountedCash;
    }

    public String getAmendReason() {
        return amendReason;
    }

    public User getAmendedBy() {
        return amendedBy;
    }

    public OffsetDateTime getAmendedAt() {
        return amendedAt;
    }
}
