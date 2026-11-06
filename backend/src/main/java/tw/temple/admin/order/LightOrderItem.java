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
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import tw.temple.admin.household.Member;
import tw.temple.admin.light.LightType;

@Entity
@Table(name = "light_order_items")
public class LightOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private LightOrder order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(optional = false)
    @JoinColumn(name = "light_type_id", nullable = false)
    private LightType lightType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    private ItemAction action;

    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    @Column(name = "override_reason", length = 100)
    private String overrideReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected LightOrderItem() {
    }

    public LightOrderItem(LightOrder order, Member member, LightType lightType, ItemAction action, int unitPrice,
                          String overrideReason) {
        this.order = order;
        this.member = member;
        this.lightType = lightType;
        this.action = action;
        this.unitPrice = unitPrice;
        this.overrideReason = overrideReason;
    }

    public Long getId() {
        return id;
    }

    public LightOrder getOrder() {
        return order;
    }

    public Member getMember() {
        return member;
    }

    public LightType getLightType() {
        return lightType;
    }

    public ItemAction getAction() {
        return action;
    }

    public int getUnitPrice() {
        return unitPrice;
    }

    public String getOverrideReason() {
        return overrideReason;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
