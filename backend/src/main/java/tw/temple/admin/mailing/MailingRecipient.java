package tw.temple.admin.mailing;

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
import java.util.LinkedHashMap;
import java.util.Map;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import tw.temple.admin.household.Household;

@Entity
@Table(name = "mailing_recipients")
public class MailingRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "household_id")
    private Household household;

    @Column(name = "recipient_name", length = 50)
    private String recipientName;

    @Column(length = 6)
    private String zip;

    @Column(length = 200)
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 50)
    private String source;

    @Column(length = 200)
    private String note;

    @Version
    @Column(nullable = false)
    private int version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MailingRecipient() {
    }

    public MailingRecipient(Household household, MailingRecipientFields fields, String source) {
        this.household = household;
        this.source = source;
        apply(fields);
    }

    public void update(Household household, MailingRecipientFields fields) {
        this.household = household;
        apply(fields);
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    private void apply(MailingRecipientFields fields) {
        this.recipientName = fields.recipientName();
        this.zip = fields.zip();
        this.address = fields.address();
        this.note = fields.note();
        this.active = fields.active();
    }

    public Long getId() {
        return id;
    }

    public Household getHousehold() {
        return household;
    }

    public boolean isLinked() {
        return household != null;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getZip() {
        return zip;
    }

    public String getAddress() {
        return address;
    }

    public boolean isActive() {
        return active;
    }

    public String getSource() {
        return source;
    }

    public String getNote() {
        return note;
    }

    public int getVersion() {
        return version;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("householdNumber", household == null ? null : household.getHouseholdNumber());
        map.put("recipientName", recipientName);
        map.put("zip", zip);
        map.put("address", address);
        map.put("active", active);
        map.put("source", source);
        map.put("note", note);
        return map;
    }
}
