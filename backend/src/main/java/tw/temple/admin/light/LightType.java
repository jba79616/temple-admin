package tw.temple.admin.light;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "light_types")
public class LightType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LightCategory category;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "short_name", nullable = false, length = 20)
    private String shortName;

    @Column(nullable = false)
    private int price;

    @Column(name = "is_taisui", nullable = false)
    private boolean taisui;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "legacy_code", length = 20)
    private String legacyCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected LightType() {
    }

    public LightType(LightTypeFields fields) {
        apply(fields);
    }

    public void update(LightTypeFields fields) {
        apply(fields);
    }

    private void apply(LightTypeFields fields) {
        this.category = fields.category();
        this.name = fields.name();
        this.shortName = fields.shortName();
        this.price = fields.price();
        this.taisui = fields.taisui();
        this.sortOrder = fields.sortOrder();
        this.active = fields.active();
        this.legacyCode = fields.legacyCode();
    }

    public Long getId() {
        return id;
    }

    public LightCategory getCategory() {
        return category;
    }

    public String getName() {
        return name;
    }

    public String getShortName() {
        return shortName;
    }

    public int getPrice() {
        return price;
    }

    public boolean isTaisui() {
        return taisui;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public String getLegacyCode() {
        return legacyCode;
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("category", category);
        map.put("name", name);
        map.put("shortName", shortName);
        map.put("price", price);
        map.put("taisui", taisui);
        map.put("sortOrder", sortOrder);
        map.put("active", active);
        map.put("legacyCode", legacyCode);
        return map;
    }
}
