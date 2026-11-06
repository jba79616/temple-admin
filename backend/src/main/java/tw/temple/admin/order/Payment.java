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
import tw.temple.admin.user.User;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private LightOrder order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentKind kind;

    @Column(nullable = false)
    private int amount;

    @Column(name = "received_on", nullable = false)
    private LocalDate receivedOn;

    @Column(name = "posted_on", nullable = false)
    private LocalDate postedOn;

    @ManyToOne
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(length = 200)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Payment() {
    }

    public Payment(LightOrder order, PaymentKind kind, int amount, LocalDate receivedOn, LocalDate postedOn,
                   User receivedBy, String note) {
        this.order = order;
        this.kind = kind;
        this.amount = amount;
        this.receivedOn = receivedOn;
        this.postedOn = postedOn;
        this.receivedBy = receivedBy;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public LightOrder getOrder() {
        return order;
    }

    public PaymentKind getKind() {
        return kind;
    }

    public int getAmount() {
        return amount;
    }

    public LocalDate getReceivedOn() {
        return receivedOn;
    }

    public LocalDate getPostedOn() {
        return postedOn;
    }

    public User getReceivedBy() {
        return receivedBy;
    }

    public String getNote() {
        return note;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
