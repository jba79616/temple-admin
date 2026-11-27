package tw.temple.admin.household;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.HouseholdDtos.DeletedMemberView;
import tw.temple.admin.household.HouseholdDtos.HouseholdDetail;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.HouseholdSummary;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.household.HouseholdDtos.RecordView;
import tw.temple.admin.systemconfig.ConfigService;
import tw.temple.admin.user.User;

@Service
@Transactional
public class HouseholdService {

    private static final int SEARCH_LIMIT = 50;
    private static final Set<String> GENDERS = Set.of("M", "F");

    private final HouseholdRepository households;
    private final MemberRepository members;
    private final HouseholdLightRecords records;
    private final ConfigService config;
    private final MemberViews memberViews;
    private final AuditService audit;
    private final TempleClock clock;

    public HouseholdService(HouseholdRepository households, MemberRepository members, HouseholdLightRecords records,
                            ConfigService config, MemberViews memberViews, AuditService audit, TempleClock clock) {
        this.households = households;
        this.members = members;
        this.records = records;
        this.config = config;
        this.memberViews = memberViews;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<HouseholdSummary> search(String q) {
        int year = config.currentYear();
        String query = q == null ? "" : q.trim();
        return households.search(query, PageRequest.of(0, SEARCH_LIMIT)).stream()
            .map(h -> summarize(h, year))
            .toList();
    }

    @Transactional(readOnly = true)
    public HouseholdSummary summarize(Household h, int year) {
        Member head = members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(h.getId()).orElse(null);
        String phone = h.getPhone() != null ? h.getPhone() : (head != null ? head.getPhone() : null);
        return new HouseholdSummary(h.getId(), h.getHouseholdNumber(), head == null ? null : head.getName(), h.cityDistrict(),
            members.countByHouseholdIdAndDeletedAtIsNull(h.getId()),
            records.countActive(h.getId(), year),
            phone);
    }

    @Transactional(readOnly = true)
    public HouseholdDetail detail(Long id, Integer yearParam) {
        Household h = get(id);
        int year = yearParam == null ? config.currentYear() : yearParam;
        Map<Character, String> taisui = memberViews.taisuiMap(year);
        List<MemberView> views = members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(id).stream()
            .map(m -> memberViews.toView(m, taisui))
            .toList();
        List<RecordView> recordViews = records.activeRecords(id, year);
        List<DeletedMemberView> deleted = members.findByHouseholdIdAndDeletedAtIsNotNullOrderByDeletedAtDescIdAsc(id).stream()
            .map(m -> new DeletedMemberView(m.getId(), m.getName(), m.getGender(), m.birthText(), m.getDeletedAt(), m.getDeleteReason()))
            .toList();
        return new HouseholdDetail(h.getId(), h.getHouseholdNumber(), h.getCity(), h.getDistrict(), h.getAddress(), h.getPhone(),
            h.getContactNote(), h.getNotes(), year, views, recordViews, deleted);
    }

    @Transactional(readOnly = true)
    public Household get(Long id) {
        return households.findById(id).orElseThrow(() -> ApiException.notFound("找不到戶"));
    }

    @Transactional(readOnly = true)
    public Member getMember(Long id) {
        return members.findById(id).orElseThrow(() -> ApiException.notFound("找不到成員"));
    }

    @Transactional(readOnly = true)
    public MemberView memberView(Long id) {
        return memberViews.toView(getMember(id), memberViews.taisuiMap(config.currentYear()));
    }

    public Household create(HouseholdInput input, User actor) {
        if (input.head() == null) {
            throw ApiException.badRequest("新增戶時必須填第一位成員作為戶長");
        }
        MemberFields headFields = validated(input.head().toFields());
        Household saved = households.save(new Household(input.toFields()));
        audit.record("households", saved.getId(), "INSERT", null, saved.snapshot(), actor);
        Member head = members.save(new Member(saved, withSortOrder(headFields, 1), true));
        audit.record("members", head.getId(), "INSERT", null, head.snapshot(), actor);
        return saved;
    }

    public Household update(Long id, HouseholdInput input, User actor) {
        Household h = get(id);
        var before = h.snapshot();
        h.update(input.toFields());
        Household saved = households.save(h);
        audit.record("households", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    public Member addMember(Long householdId, MemberInput input, User actor) {
        Household h = get(householdId);
        MemberFields fields = validated(input.toFields());
        boolean firstMember = members.countByHouseholdIdAndDeletedAtIsNull(householdId) == 0;
        if (fields.sortOrder() == null) {
            fields = withSortOrder(fields, members.maxSortOrder(householdId) + 1);
        }
        Member saved = members.save(new Member(h, fields, firstMember));
        audit.record("members", saved.getId(), "INSERT", null, saved.snapshot(), actor);
        return saved;
    }

    public Member updateMember(Long memberId, MemberInput input, User actor) {
        Member m = getMember(memberId);
        if (m.isDeleted()) {
            throw ApiException.badRequest("成員已刪除");
        }
        MemberFields fields = validated(input.toFields());
        var before = m.snapshot();
        m.update(fields);
        Member saved = members.save(m);
        audit.record("members", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    public void deleteMember(Long memberId, String reason, Long newHeadId, User actor) {
        Member m = getMember(memberId);
        if (m.isDeleted()) {
            throw ApiException.badRequest("成員已刪除");
        }
        var before = m.snapshot();
        if (m.isHead()) {
            boolean others = members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(m.getHousehold().getId()).stream()
                .anyMatch(x -> !x.getId().equals(memberId));
            if (others) {
                if (newHeadId == null) {
                    throw ApiException.badRequest("刪除戶長前請先指定新戶長");
                }
                Member newHead = getMember(newHeadId);
                if (newHead.getId().equals(memberId) || !newHead.getHousehold().getId().equals(m.getHousehold().getId())) {
                    throw ApiException.badRequest("新戶長必須是同一戶的其他成員");
                }
                m.markHead(false);
                members.saveAndFlush(m);
                setHead(newHead, actor);
            }
        }
        m.softDelete(reason.trim(), clock.now());
        Member saved = members.save(m);
        audit.record("members", saved.getId(), "DELETE", before, saved.snapshot(), actor);
    }

    public Member restoreMember(Long memberId, User actor) {
        Member m = getMember(memberId);
        if (!m.isDeleted()) {
            throw ApiException.badRequest("這位成員沒有被刪除");
        }
        var before = m.snapshot();
        Long householdId = m.getHousehold().getId();
        m.restore();
        m.setSortOrder(members.maxSortOrder(householdId) + 1);
        if (members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(householdId).isEmpty()) {
            m.markHead(true);
        }
        Member saved = members.save(m);
        audit.record("members", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    public Member setHead(Long memberId, User actor) {
        return setHead(getMember(memberId), actor);
    }

    private Member setHead(Member target, User actor) {
        if (target.isDeleted()) {
            throw ApiException.badRequest("已刪除的成員不能當戶長");
        }
        Long householdId = target.getHousehold().getId();
        members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(householdId).ifPresent(current -> {
            if (!current.getId().equals(target.getId())) {
                var before = current.snapshot();
                current.markHead(false);
                members.saveAndFlush(current);
                audit.record("members", current.getId(), "UPDATE", before, current.snapshot(), actor);
            }
        });
        var before = target.snapshot();
        target.markHead(true);
        Member saved = members.save(target);
        audit.record("members", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    public Member moveMember(Long memberId, Long targetHouseholdId, User actor) {
        Member m = getMember(memberId);
        if (m.isDeleted()) {
            throw ApiException.badRequest("成員已刪除");
        }
        Household target = get(targetHouseholdId);
        if (target.getId().equals(m.getHousehold().getId())) {
            throw ApiException.badRequest("成員已在這一戶");
        }
        var before = m.snapshot();
        m.moveTo(target);
        m.setSortOrder(members.maxSortOrder(targetHouseholdId) + 1);
        Member saved = members.save(m);
        records.moveActiveRecordsOfMember(memberId, config.currentYear(), target);
        audit.record("members", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    private MemberFields validated(MemberFields f) {
        if (f.gender() != null && !GENDERS.contains(f.gender())) {
            throw ApiException.badRequest("性別只能是 M 或 F");
        }
        if (f.birthGanzhi() != null && !Ganzhi.isValid(f.birthGanzhi())) {
            throw ApiException.badRequest("干支年不是六十甲子裡的組合");
        }
        if (f.birthMonth() != null && (f.birthMonth() < 1 || f.birthMonth() > 12)) {
            throw ApiException.badRequest("月份必須是 1 到 12");
        }
        if (f.birthDay() != null && (f.birthDay() < 1 || f.birthDay() > 30)) {
            throw ApiException.badRequest("日期必須是 1 到 30");
        }
        if (f.birthMonthIsLeap() && f.birthMonth() == null) {
            throw ApiException.badRequest("月份為空時不能標閏月");
        }
        if (f.birthHourBranch() != null && (f.birthHourBranch().length() != 1 || Ganzhi.BRANCHES.indexOf(f.birthHourBranch()) < 0)) {
            throw ApiException.badRequest("時辰必須是十二地支之一");
        }
        return f;
    }

    private MemberFields withSortOrder(MemberFields f, int sortOrder) {
        return new MemberFields(f.name(), f.gender(), f.city(), f.district(), f.address(), f.phone(), f.birthGanzhi(),
            f.birthMonth(), f.birthMonthIsLeap(), f.birthDay(), f.birthHourBranch(), sortOrder);
    }
}
