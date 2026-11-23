package tw.temple.admin.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.Member;
import tw.temple.admin.light.LightType;

/** 只寫有改的欄位：card_printed_at 由批次 UPDATE 標記，實體存檔不能拿載入時的舊值蓋回去。 */
@Entity
@DynamicUpdate
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_order_item_id")
    private LightOrderItem lastOrderItem;

    @Column(name = "card_printed_at")
    private OffsetDateTime cardPrintedAt;

    @Version
    @Column(nullable = false)
    private int version;

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

    /** 由停用轉回啟用才算新卡要重印；重建狀態表只修單價時不動已印紀錄。 */
    public void activate(int price, Household in, LightOrderItem byItem) {
        if (!active) {
            this.cardPrintedAt = null;
        }
        this.active = true;
        this.unitPrice = price;
        this.household = in;
        this.lastOrderItem = byItem;
    }

    public void markCardPrinted(OffsetDateTime at) {
        this.cardPrintedAt = at;
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

    public OffsetDateTime getCardPrintedAt() {
        return cardPrintedAt;
    }

    public LightOrderItem getLastOrderItem() {
        return lastOrderItem;
    }
}
