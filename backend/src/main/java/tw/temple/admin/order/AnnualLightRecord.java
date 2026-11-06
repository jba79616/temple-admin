package tw.temple.admin.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.Member;
import tw.temple.admin.light.LightType;

@Entity
@Table(name = "annual_light_records")
public class AnnualLightRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int year;

    @ManyToOne(optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(optional = false)
    @JoinColumn(name = "light_type_id", nullable = false)
    private LightType lightType;

    @ManyToOne(optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @ManyToOne
    @JoinColumn(name = "last_order_item_id")
    private LightOrderItem lastOrderItem;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AnnualLightRecord() {
    }

    public AnnualLightRecord(int year, Member member, LightType lightType, Household household, int unitPrice,
                             LightOrderItem lastOrderItem) {
        this.year = year;
        this.member = member;
        this.lightType = lightType;
        this.household = household;
        this.unitPrice = unitPrice;
        this.lastOrderItem = lastOrderItem;
    }

    public void activate(int price, Household in, LightOrderItem byItem) {
        this.active = true;
        this.unitPrice = price;
        this.household = in;
        this.lastOrderItem = byItem;
    }

    public void deactivate(LightOrderItem byItem) {
        this.active = false;
        this.lastOrderItem = byItem;
    }

    public void moveTo(Household target) {
        this.household = target;
    }

    public Long getId() {
        return id;
    }

    public int getYear() {
        return year;
    }

    public Member getMember() {
        return member;
    }

    public LightType getLightType() {
        return lightType;
    }

    public Household getHousehold() {
        return household;
    }

    public int getUnitPrice() {
        return unitPrice;
    }

    public boolean isActive() {
        return active;
    }

    public LightOrderItem getLastOrderItem() {
        return lastOrderItem;
    }
}
