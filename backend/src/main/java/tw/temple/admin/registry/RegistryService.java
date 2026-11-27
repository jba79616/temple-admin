package tw.temple.admin.registry;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.household.MemberViews;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.registry.RegistryDtos.HouseholdRow;
import tw.temple.admin.registry.RegistryDtos.MemberRow;
import tw.temple.admin.registry.RegistryDtos.PageView;
import tw.temple.admin.systemconfig.ConfigService;

@Service
@Transactional(readOnly = true)
public class RegistryService {

    private static final int MAX_SIZE = 200;

    private final MemberRepository members;
    private final HouseholdRepository households;
    private final AnnualLightRecordRepository records;
    private final MemberViews memberViews;
    private final ConfigService config;

    public RegistryService(MemberRepository members, HouseholdRepository households, AnnualLightRecordRepository records,
                           MemberViews memberViews, ConfigService config) {
        this.members = members;
        this.households = households;
        this.records = records;
        this.memberViews = memberViews;
        this.config = config;
    }

    public PageView<MemberRow> members(int page, int size, boolean litOnly, Integer yearParam) {
        int year = yearOf(yearParam);
        Pageable pageable = pageable(page, size);
        Page<Member> found = litOnly ? records.pageLitMembers(year, pageable) : members.pageActive(pageable);
        Map<Character, String> taisui = memberViews.taisuiMap(year);
        List<Long> ids = found.getContent().stream().map(Member::getId).toList();
        Map<Long, List<String>> lanterns = lanternNames(ids.isEmpty() ? List.of() : records.findByYearAndMemberIdInAndActiveTrue(year, ids));
        List<MemberRow> rows = found.getContent().stream()
            .map(m -> toRow(m, taisui, lanterns.getOrDefault(m.getId(), List.of())))
            .toList();
        return new PageView<>(rows, found.getNumber(), found.getSize(), found.getTotalElements(), found.getTotalPages());
    }

    public PageView<HouseholdRow> households(int page, int size, boolean litOnly, Integer yearParam) {
        int year = yearOf(yearParam);
        Pageable pageable = pageable(page, size);
        Page<Household> found = litOnly ? records.pageLitHouseholds(year, pageable) : households.pageAll(pageable);
        List<Long> ids = found.getContent().stream().map(Household::getId).toList();
        Map<Long, List<Member>> membersByHousehold = ids.isEmpty() ? Map.of()
            : members.findByHouseholdIdInAndDeletedAtIsNullOrderBySortOrderAscIdAsc(ids).stream()
                .collect(Collectors.groupingBy(m -> m.getHousehold().getId()));
        List<AnnualLightRecord> lit = ids.isEmpty() ? List.of() : records.findByYearAndHouseholdIdInAndActiveTrueAndMemberDeletedAtIsNull(year, ids);
        Map<Long, Long> lanternCounts = lit.stream().collect(Collectors.groupingBy(r -> r.getHousehold().getId(), Collectors.counting()));
        Map<Long, List<String>> lanterns = lanternNames(lit);
        Map<Character, String> taisui = memberViews.taisuiMap(year);
        List<HouseholdRow> rows = found.getContent().stream()
            .map(h -> toRow(h, membersByHousehold.getOrDefault(h.getId(), List.of()), lanternCounts.getOrDefault(h.getId(), 0L), taisui, lanterns))
            .toList();
        return new PageView<>(rows, found.getNumber(), found.getSize(), found.getTotalElements(), found.getTotalPages());
    }

    private int yearOf(Integer yearParam) {
        return yearParam == null ? config.currentYear() : yearParam;
    }

    private Pageable pageable(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_SIZE));
    }

    private Map<Long, List<String>> lanternNames(List<AnnualLightRecord> lit) {
        return lit.stream()
            .sorted(Comparator.comparingInt(r -> r.getLightType().getSortOrder()))
            .collect(Collectors.groupingBy(r -> r.getMember().getId(),
                Collectors.mapping(r -> r.getLightType().getShortName(), Collectors.toList())));
    }

    private MemberRow toRow(Member m, Map<Character, String> taisui, List<String> lanterns) {
        MemberView view = memberViews.toView(m, taisui);
        Household h = m.getHousehold();
        String phone = m.getPhone() != null ? m.getPhone() : h.getPhone();
        return new MemberRow(m.getId(), h.getId(), h.getHouseholdNumber(), m.getName(), m.getGender(), m.isHead(),
            view.birthText(), view.zodiac(), view.taisui(), m.printCityDistrict(), m.printAddress(), phone, lanterns);
    }

    private HouseholdRow toRow(Household h, List<Member> activeMembers, long lanternCount, Map<Character, String> taisui,
                               Map<Long, List<String>> lanterns) {
        Member head = activeMembers.stream().filter(Member::isHead).findFirst().orElse(null);
        MemberView headView = head == null ? null : memberViews.toView(head, taisui);
        String phone = h.getPhone() != null ? h.getPhone() : head == null ? null : head.getPhone();
        List<MemberRow> memberRows = activeMembers.stream()
            .map(m -> toRow(m, taisui, lanterns.getOrDefault(m.getId(), List.of())))
            .toList();
        return new HouseholdRow(h.getId(), h.getHouseholdNumber(), head == null ? null : head.getId(),
            head == null ? null : head.getName(), headView == null ? null : headView.birthText(),
            headView == null ? null : headView.zodiac(), headView == null ? null : headView.taisui(),
            h.cityDistrict(), h.getAddress(), phone, activeMembers.size(), lanternCount, memberRows);
    }
}
