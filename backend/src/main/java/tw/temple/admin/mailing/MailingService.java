package tw.temple.admin.mailing;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.household.TaiwanAddress;
import tw.temple.admin.household.TaiwanAddress.Split;
import tw.temple.admin.mailing.MailingDtos.MailingInput;
import tw.temple.admin.mailing.MailingDtos.MailingView;
import tw.temple.admin.user.User;

@Service
@Transactional
public class MailingService {

    static final String TABLE = "mailing_recipients";

    private final MailingRecipientRepository recipients;
    private final HouseholdRepository households;
    private final MemberRepository members;
    private final AuditService audit;

    public MailingService(MailingRecipientRepository recipients, HouseholdRepository households, MemberRepository members,
                          AuditService audit) {
        this.recipients = recipients;
        this.households = households;
        this.members = members;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<MailingView> list(Long householdId) {
        if (householdId != null) {
            return views(recipients.findByHouseholdId(householdId).map(List::of).orElse(List.of()));
        }
        return views(recipients.findAllOrdered());
    }

    @Transactional(readOnly = true)
    public MailingView view(Long id) {
        return views(List.of(get(id))).get(0);
    }

    public MailingRecipient get(Long id) {
        return recipients.findById(id).orElseThrow(() -> ApiException.notFound("找不到這筆收件人"));
    }

    public MailingRecipient create(MailingInput input, User actor) {
        Household household = resolveHousehold(input.householdNumber(), null);
        MailingRecipient saved = recipients.save(new MailingRecipient(household, validated(input.toFields(), household), "手動建立"));
        audit.record(TABLE, saved.getId(), "INSERT", null, saved.snapshot(), actor);
        return saved;
    }

    public MailingRecipient update(Long id, MailingInput input, User actor) {
        MailingRecipient recipient = get(id);
        if (input.version() != null && input.version() != recipient.getVersion()) {
            throw ApiException.conflict("這筆收件人剛被別人改過，請重新整理後再改");
        }
        Map<String, Object> before = recipient.snapshot();
        Household household = resolveHousehold(input.householdNumber(), id);
        recipient.update(household, validated(input.toFields(), household));
        MailingRecipient saved = recipients.save(recipient);
        audit.record(TABLE, saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    /** 戶頁與名單上的暫停／恢復只動 active，不把畫面上的舊欄位整包送回來蓋掉別人的修改。 */
    public MailingRecipient setActive(Long id, boolean active, User actor) {
        MailingRecipient recipient = get(id);
        Map<String, Object> before = recipient.snapshot();
        recipient.setActive(active);
        MailingRecipient saved = recipients.save(recipient);
        audit.record(TABLE, saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    public void delete(Long id, User actor) {
        MailingRecipient recipient = get(id);
        Map<String, Object> before = recipient.snapshot();
        recipients.delete(recipient);
        audit.record(TABLE, id, "DELETE", before, null, actor);
    }

    MailingRecipientFields validated(MailingRecipientFields fields, Household household) {
        if (household == null && (fields.recipientName() == null || fields.address() == null)) {
            throw ApiException.badRequest("沒連到戶的收件人要有姓名與地址");
        }
        if (fields.zip() != null && !MailingDtos.isZip(fields.zip())) {
            throw ApiException.badRequest("郵遞區號要 3 碼或 5 碼數字");
        }
        return fields.address() == null ? fields : fields.withAddress(TaiwanAddress.normalize(fields.address()));
    }

    /** 一戶只留一列，否則同一戶會收到兩份帖子。 */
    Household resolveHousehold(Integer householdNumber, Long selfId) {
        if (householdNumber == null) {
            return null;
        }
        Household household = households.findByHouseholdNumber(householdNumber)
            .orElseThrow(() -> ApiException.notFound("找不到戶 " + householdNumber));
        recipients.findByHouseholdId(household.getId())
            .filter(existing -> !existing.getId().equals(selfId))
            .ifPresent(existing -> {
                throw ApiException.conflict("戶 " + householdNumber + " 已在帖子名單");
            });
        return household;
    }

    List<MailingView> views(List<MailingRecipient> rows) {
        Set<Long> householdIds = rows.stream()
            .map(MailingRecipient::getHousehold)
            .filter(Objects::nonNull)
            .map(Household::getId)
            .collect(Collectors.toSet());
        Map<Long, String> heads = householdIds.isEmpty() ? Map.of()
            : members.findByHouseholdIdInAndHeadTrueAndDeletedAtIsNull(householdIds).stream()
                .collect(Collectors.toMap(m -> m.getHousehold().getId(), Member::getName));
        return rows.stream().map(r -> toView(r, heads)).toList();
    }

    private MailingView toView(MailingRecipient r, Map<Long, String> heads) {
        Household h = r.getHousehold();
        if (h != null) {
            String head = heads.get(h.getId());
            String name = r.getRecipientName() != null ? r.getRecipientName() : head;
            String address = h.cityDistrict() + (h.getAddress() == null ? "" : h.getAddress());
            return new MailingView(r.getId(), h.getId(), h.getHouseholdNumber(), head, r.getRecipientName(), name, r.getZip(),
                h.getCity(), h.getDistrict(), address, r.isActive(), TaiwanAddress.isOverseas(address), r.getSource(), r.getNote(),
                r.getVersion());
        }
        Split split = TaiwanAddress.split(r.getAddress());
        return new MailingView(r.getId(), null, null, null, r.getRecipientName(), r.getRecipientName(), r.getZip(),
            split.city(), split.district(), r.getAddress(), r.isActive(), TaiwanAddress.isOverseas(r.getAddress()), r.getSource(),
            r.getNote(), r.getVersion());
    }
}
