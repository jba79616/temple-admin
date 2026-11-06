package tw.temple.admin.household;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.calendar.Taisui;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.HouseholdDtos.HouseholdDetail;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.HouseholdSummary;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.household.HouseholdDtos.RecordView;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.systemconfig.ConfigService;
import tw.temple.admin.user.User;

@Service
@Transactional
public class HouseholdService {

    private static final int SEARCH_LIMIT = 50;
    private static final Set<String> GENDERS = Set.of("M", "F");

    private final HouseholdRepository households;
    private final MemberRepository members;
    private final AnnualLightRecordRepository records;
    private final ConfigService config;
    private final AuditService audit;
    private final TempleClock clock;

    public HouseholdService(HouseholdRepository households, MemberRepository members, AnnualLightRecordRepository records,
                            ConfigService config, AuditService audit, TempleClock clock) {
        this.households = households;
        this.members = members;
        this.records = records;
        this.config = config;
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
            members.countByHouseholdIdAndDeletedAtIsNull(h.getId()), records.countByHouseholdIdAndYearAndActiveTrue(h.getId(), year),
            phone);
    }

    @Transactional(readOnly = true)
    public HouseholdDetail detail(Long id, Integer yearParam) {
        Household h = get(id);
        int year = yearParam == null ? config.currentYear() : yearParam;
        Map<Character, String> taisui = taisuiMap(year);
        List<MemberView> views = members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(id).stream()
            .map(m -> toView(m, taisui))
            .toList();
        List<RecordView> recordViews = records.findByHouseholdIdAndYearAndActiveTrue(id, year).stream()
            .map(r -> new RecordView(r.getMember().getId(), r.getLightType().getId(), r.getUnitPrice()))
            .toList();
        return new HouseholdDetail(h.getId(), h.getHouseholdNumber(), h.getCity(), h.getDistrict(), h.getAddress(), h.getPhone(),
            h.getContactNote(), h.getNotes(), year, views, recordViews);
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
        return toView(getMember(id), taisuiMap(config.currentYear()));
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
                m.markHead(false);
                members.saveAndFlush(m);
                setHead(newHeadId, actor);
            }
        }
        m.softDelete(reason.trim(), clock.now());
        Member saved = members.save(m);
        audit.record("members", saved.getId(), "DELETE", before, saved.snapshot(), actor);
    }

    public Member setHead(Long memberId, User actor) {
        Member target = getMember(memberId);
        if (target.isDeleted()) {
            throw ApiException.badRequest("已刪除的成員不能當戶長");
        }
        Long householdId = target.getHousehold().getId();
        members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(householdId).ifPresent(current -> {
            if (!current.getId().equals(memberId)) {
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
        int year = config.currentYear();
        for (AnnualLightRecord record : records.findByMemberIdAndYearAndActiveTrue(memberId, year)) {
            record.moveTo(target);
            records.save(record);
        }
        audit.record("members", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    @Transactional(readOnly = true)
    public Map<Character, String> taisuiMap(int year) {
        return Taisui.relationsFor(Ganzhi.branchOfYear(year), config.taisuiRelations());
    }

    public MemberView toView(Member m, Map<Character, String> taisui) {
        String branch = m.getBirthBranch();
        if (branch == null && Ganzhi.isValid(m.getBirthGanzhi())) {
            branch = String.valueOf(m.getBirthGanzhi().charAt(1));
        }
        String zodiac = branch == null ? null : Ganzhi.zodiac(branch.charAt(0));
        String relation = branch == null ? null : taisui.get(branch.charAt(0));
        return new MemberView(m.getId(), m.getHousehold().getId(), m.getName(), m.getGender(), m.isHead(), m.getSortOrder(),
            m.getCity(), m.getDistrict(), m.getAddress(), m.getPhone(), m.getBirthGanzhi(), branch,
            m.getBirthMonth() == null ? null : m.getBirthMonth().intValue(), m.isBirthMonthIsLeap(),
            m.getBirthDay() == null ? null : m.getBirthDay().intValue(), m.getBirthHourBranch(), zodiac, relation,
            m.birthText(), m.isDeleted());
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
