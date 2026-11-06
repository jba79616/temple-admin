package tw.temple.admin.household;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.generator.EventType;

@Entity
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 1)
    private String gender;

    @Column(name = "is_head", nullable = false)
    private boolean head;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    @Column(length = 10)
    private String city;

    @Column(length = 10)
    private String district;

    @Column(length = 200)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "birth_ganzhi", length = 2)
    private String birthGanzhi;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "birth_branch", length = 1, insertable = false, updatable = false)
    private String birthBranch;

    @Column(name = "birth_month")
    private Short birthMonth;

    @Column(name = "birth_month_is_leap", nullable = false)
    private boolean birthMonthIsLeap;

    @Column(name = "birth_day")
    private Short birthDay;

    @Column(name = "birth_hour_branch", length = 1)
    private String birthHourBranch;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "delete_reason", length = 100)
    private String deleteReason;

    @Column(name = "legacy_id")
    private Integer legacyId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Member() {
    }

    public Member(Household household, MemberFields fields, boolean head) {
        this.household = household;
        this.head = head;
        apply(fields);
    }

    public void update(MemberFields fields) {
        apply(fields);
    }

    private void apply(MemberFields fields) {
        this.name = fields.name();
        this.gender = fields.gender();
        this.city = fields.city();
        this.district = fields.district();
        this.address = fields.address();
        this.phone = fields.phone();
        this.birthGanzhi = fields.birthGanzhi();
        this.birthMonth = fields.birthMonth() == null ? null : fields.birthMonth().shortValue();
        this.birthMonthIsLeap = fields.birthMonthIsLeap();
        this.birthDay = fields.birthDay() == null ? null : fields.birthDay().shortValue();
        this.birthHourBranch = fields.birthHourBranch();
        if (fields.sortOrder() != null) {
            this.sortOrder = fields.sortOrder().shortValue();
        }
    }

    public void markHead(boolean nowHead) {
        this.head = nowHead;
    }

    public void setSortOrder(int order) {
        this.sortOrder = (short) order;
    }

    public void moveTo(Household target) {
        this.household = target;
        this.head = false;
    }

    public void softDelete(String reason, OffsetDateTime at) {
        this.deletedAt = at;
        this.deleteReason = reason;
        this.head = false;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public Long getId() {
        return id;
    }

    public Household getHousehold() {
        return household;
    }

    public String getName() {
        return name;
    }

    public String getGender() {
        return gender;
    }

    public boolean isHead() {
        return head;
    }

    public short getSortOrder() {
        return sortOrder;
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

    public String getBirthGanzhi() {
        return birthGanzhi;
    }

    public String getBirthBranch() {
        return birthBranch;
    }

    public Short getBirthMonth() {
        return birthMonth;
    }

    public boolean isBirthMonthIsLeap() {
        return birthMonthIsLeap;
    }

    public Short getBirthDay() {
        return birthDay;
    }

    public String getBirthHourBranch() {
        return birthHourBranch;
    }

    public OffsetDateTime getDeletedAt() {
        return deletedAt;
    }

    public String getDeleteReason() {
        return deleteReason;
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

    /** 列印用的縣市鄉鎮市區：成員沒填就沿用戶的。 */
    public String printCityDistrict() {
        if (city != null || district != null) {
            return (city == null ? "" : city) + (district == null ? "" : district);
        }
        return household.cityDistrict();
    }

    public String printAddress() {
        return address != null ? address : (household.getAddress() == null ? "" : household.getAddress());
    }

    /** 頌經名冊的生庚字串：{年}年 {閏?}{月}月 {日}日 {時}時 生，空值印「吉」。 */
    public String birthText() {
        String year = birthGanzhi == null ? "吉" : birthGanzhi;
        String month = (birthMonthIsLeap ? "閏" : "") + (birthMonth == null ? "吉" : birthMonth.toString());
        String day = birthDay == null ? "吉" : birthDay.toString();
        String hour = birthHourBranch == null ? "吉" : birthHourBranch;
        return year + "年 " + month + "月 " + day + "日 " + hour + "時 生";
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("householdId", household.getId());
        map.put("name", name);
        map.put("gender", gender);
        map.put("head", head);
        map.put("sortOrder", sortOrder);
        map.put("city", city);
        map.put("district", district);
        map.put("address", address);
        map.put("phone", phone);
        map.put("birthGanzhi", birthGanzhi);
        map.put("birthMonth", birthMonth);
        map.put("birthMonthIsLeap", birthMonthIsLeap);
        map.put("birthDay", birthDay);
        map.put("birthHourBranch", birthHourBranch);
        map.put("deletedAt", deletedAt == null ? null : deletedAt.toString());
        map.put("deleteReason", deleteReason);
        return map;
    }
}
