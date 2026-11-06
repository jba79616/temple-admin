package tw.temple.admin.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import tw.temple.admin.household.Household;
import tw.temple.admin.user.User;

@Entity
@Table(name = "light_orders")
public class LightOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderStatus status = OrderStatus.ACTIVE;

    @Column(nullable = false)
    private int year;

    @ManyToOne(optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(name = "registered_on", nullable = false)
    private LocalDate registeredOn;

    @Column(name = "posted_on", nullable = false)
    private LocalDate postedOn;

    @Column(name = "total_due", nullable = false)
    private int totalDue;

    @ManyToOne
    @JoinColumn(name = "corrects_order_id")
    private LightOrder correctsOrder;

    @Column(length = 200)
    private String note;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "voided_by")
    private User voidedBy;

    @Column(name = "voided_at")
    private OffsetDateTime voidedAt;

    @Column(name = "void_reason", length = 200)
    private String voidReason;

    protected LightOrder() {
    }

    public LightOrder(OrderKind kind, int year, Household household, LocalDate registeredOn, LocalDate postedOn,
                      LightOrder correctsOrder, String note, User createdBy) {
        this.kind = kind;
        this.year = year;
        this.household = household;
        this.registeredOn = registeredOn;
        this.postedOn = postedOn;
        this.correctsOrder = correctsOrder;
        this.note = note;
        this.createdBy = createdBy;
    }

    public void settleTotalDue(int due) {
        this.totalDue = due;
    }

    public void markVoided(User by, OffsetDateTime at, String reason) {
        this.status = OrderStatus.VOIDED;
        this.voidedBy = by;
        this.voidedAt = at;
        this.voidReason = reason;
    }

    /** 只給測試與匯入用：把入帳日改到過去，模擬已日結的歷史單。 */
    public void backdatePostedOn(LocalDate date) {
        this.postedOn = date;
    }

    public boolean isActive() {
        return status == OrderStatus.ACTIVE;
    }

    public Long getId() {
        return id;
    }

    public OrderKind getKind() {
        return kind;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public int getYear() {
        return year;
    }

    public Household getHousehold() {
        return household;
    }

    public LocalDate getRegisteredOn() {
        return registeredOn;
    }

    public LocalDate getPostedOn() {
        return postedOn;
    }

    public int getTotalDue() {
        return totalDue;
    }

    public LightOrder getCorrectsOrder() {
        return correctsOrder;
    }

    public String getNote() {
        return note;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public User getVoidedBy() {
        return voidedBy;
    }

    public OffsetDateTime getVoidedAt() {
        return voidedAt;
    }

    public String getVoidReason() {
        return voidReason;
    }
}
