package tw.temple.admin.household;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "households")
public class Household {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Generated
    @Column(name = "household_number", insertable = false, updatable = false)
    private Integer householdNumber;

    @Column(length = 10)
    private String city;

    @Column(length = 10)
    private String district;

    @Column(length = 200)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "contact_note", length = 100)
    private String contactNote;

    private String notes;

    @Column(name = "legacy_id")
    private Integer legacyId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Household() {
    }

    public Household(HouseholdFields fields) {
        apply(fields);
    }

    public void update(HouseholdFields fields) {
        apply(fields);
    }

    private void apply(HouseholdFields fields) {
        this.city = fields.city();
        this.district = fields.district();
        this.address = fields.address();
        this.phone = fields.phone();
        this.contactNote = fields.contactNote();
        this.notes = fields.notes();
    }

    public Long getId() {
        return id;
    }

    public Integer getHouseholdNumber() {
        return householdNumber;
    }

    public String getCity() {
        return city;
    }

    public String getDistrict() {
        return district;
    }

    public String getAddress() {
        return address;
    }

    public String getPhone() {
        return phone;
    }

    public String getContactNote() {
        return contactNote;
    }

    public String getNotes() {
        return notes;
    }

    public Integer getLegacyId() {
        return legacyId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String cityDistrict() {
        return (city == null ? "" : city) + (district == null ? "" : district);
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("householdNumber", householdNumber);
        map.put("city", city);
        map.put("district", district);
        map.put("address", address);
        map.put("phone", phone);
        map.put("contactNote", contactNote);
        map.put("notes", notes);
        return map;
    }
}
