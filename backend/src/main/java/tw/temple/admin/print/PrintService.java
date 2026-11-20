package tw.temple.admin.print;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.light.LightCategory;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.LightOrderItemRepository;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.systemconfig.ConfigService;

@Service
@Transactional(readOnly = true)
public class PrintService {

    public enum FormScope { ALL, LIT, BAGUA }

    public record PersonRow(String name, String gender, String birthText, String address) {
    }

    public record HouseholdGroup(Integer householdNumber, String headName, List<PersonRow> rows) {
    }

    public record NameList(String templeName, int year, int rocYear, String ganzhiYear, String lightTypeName, String title,
                           String prayerMonth, boolean all, List<HouseholdGroup> groups) {
    }

    public record Card(String shortName, String detail, String name, String cityDistrict, String address) {
    }

    public record Cards(String templeName, int year, int rocYear, String lightTypeName, List<Card> cards) {
    }

    public record FormPerson(String name, String gender, String ganzhi, boolean leap, Short month, Short day, String hour) {
    }

    public record FormHousehold(Integer householdNumber, String headName, String address, List<FormPerson> people) {
    }

    public record BaguaType(String code, String name) {
    }

    public record ApplicationForm(String templeName, int year, int rocYear, FormScope scope, String title,
                                  List<BaguaType> baguaTypes, List<FormHousehold> households) {
    }

    private static final String BAGUA_LABEL = "八卦轉運斗";
    private static final Comparator<AnnualLightRecord> BY_HOUSEHOLD_THEN_MEMBER =
        Comparator.comparing((AnnualLightRecord r) -> r.getHousehold().getHouseholdNumber())
            .thenComparing(r -> r.getMember().getSortOrder())
            .thenComparing(r -> r.getMember().getId());

    private record Selection(LightType type, LightCategory category) {
        String label() {
            if (type != null) {
                return type.getName();
            }
            return category == LightCategory.BAGUA ? BAGUA_LABEL : "一般燈";
        }

        boolean matches(AnnualLightRecord r) {
            return type != null ? r.getLightType().getId().equals(type.getId()) : r.getLightType().getCategory() == category;
        }
    }

    private final AnnualLightRecordRepository records;
    private final MemberRepository members;
    private final LightTypeRepository lightTypes;
    private final LightOrderRepository orders;
    private final LightOrderItemRepository items;
    private final ConfigService config;

    public PrintService(AnnualLightRecordRepository records, MemberRepository members, LightTypeRepository lightTypes,
                        LightOrderRepository orders, LightOrderItemRepository items, ConfigService config) {
        this.records = records;
        this.members = members;
        this.lightTypes = lightTypes;
        this.orders = orders;
        this.items = items;
        this.config = config;
    }

    public NameList nameList(Integer yearParam, Long lightTypeId, LightCategory category, boolean all) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        Selection sel = select(lightTypeId, category);
        Map<Household, Collection<Member>> grouped = all ? allByHousehold() : litByHousehold(sortedRecords(year, sel::matches));
        List<HouseholdGroup> groups = grouped.entrySet().stream()
            .map(e -> new HouseholdGroup(e.getKey().getHouseholdNumber(), headName(e.getKey()), e.getValue().stream().map(this::toRow).toList()))
            .toList();
        return new NameList(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), Ganzhi.ofYear(year), sel.label(),
            "安奉 " + sel.label() + " 善信名單", config.get(ConfigService.PRAYER_MONTH), all, groups);
    }

    public Cards cardsByYear(Integer yearParam, Long lightTypeId, LightCategory category) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        Selection sel = select(lightTypeId, category);
        List<Card> cards = sortedRecords(year, sel::matches).stream().map(r -> toCard(r.getLightType(), r.getMember())).toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), sel.label(), cards);
    }

    public Cards cardsByOrder(Long orderId) {
        LightOrder order = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("找不到單據"));
        if (!order.isActive()) {
            throw ApiException.badRequest("已作廢的單不能印安燈卡");
        }
        List<Card> cards = items.findByOrderIdOrderByIdAsc(orderId).stream()
            .filter(i -> i.getAction() == ItemAction.ADD && !i.isReversal())
            .map(i -> toCard(i.getLightType(), i.getMember()))
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), order.getYear(), Ganzhi.roc(order.getYear()), null, cards);
    }

    public ApplicationForm applicationForm(FormScope scope, Integer yearParam) {
        int year = yearParam == null ? config.currentYear() - 1 : yearParam;
        Map<Household, Collection<Member>> grouped = scope == FormScope.ALL ? allByHousehold()
            : litByHousehold(sortedRecords(year, r -> inScope(scope, r)));
        List<FormHousehold> households = grouped.entrySet().stream()
            .map(e -> toFormHousehold(e.getKey(), e.getValue()))
            .toList();
        List<BaguaType> baguaTypes = scope == FormScope.BAGUA
            ? lightTypes.findByActiveTrueOrderBySortOrderAscIdAsc().stream()
                .filter(t -> t.getCategory() == LightCategory.BAGUA)
                .map(t -> new BaguaType(t.getLegacyCode(), t.getName()))
                .toList()
            : List.of();
        String title = scope == FormScope.BAGUA ? "八卦轉運斗" : "參加安斗申報單";
        return new ApplicationForm(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), scope, title, baguaTypes, households);
    }

    private PersonRow toRow(Member m) {
        return new PersonRow(m.getName(), m.getGender(), m.birthText(), m.printCityDistrict() + m.printAddress());
    }

    private Card toCard(LightType type, Member m) {
        boolean bagua = type.getCategory() == LightCategory.BAGUA;
        return new Card(bagua ? BAGUA_LABEL : type.getShortName(), bagua ? type.getName() : null, m.getName(), m.printCityDistrict(),
            m.printAddress());
    }

    private Selection select(Long lightTypeId, LightCategory category) {
        if (lightTypeId != null) {
            return new Selection(lightTypes.findById(lightTypeId).orElseThrow(() -> ApiException.notFound("找不到燈種")), null);
        }
        if (category == null) {
            throw ApiException.badRequest("請指定燈種或分類");
        }
        return new Selection(null, category);
    }

    private boolean inScope(FormScope scope, AnnualLightRecord r) {
        return scope == FormScope.LIT || r.getLightType().getCategory() == LightCategory.BAGUA;
    }

    private List<AnnualLightRecord> sortedRecords(int year, Predicate<AnnualLightRecord> filter) {
        return records.findByYearAndActiveTrueAndMemberDeletedAtIsNull(year).stream().filter(filter).sorted(BY_HOUSEHOLD_THEN_MEMBER).toList();
    }

    private Map<Household, Collection<Member>> allByHousehold() {
        Map<Household, Collection<Member>> grouped = new LinkedHashMap<>();
        for (Member m : members.findAllActiveOrdered()) {
            grouped.computeIfAbsent(m.getHousehold(), k -> new ArrayList<>()).add(m);
        }
        return grouped;
    }

    private Map<Household, Collection<Member>> litByHousehold(List<AnnualLightRecord> sorted) {
        Map<Household, Map<Long, Member>> byId = new LinkedHashMap<>();
        for (AnnualLightRecord r : sorted) {
            byId.computeIfAbsent(r.getHousehold(), k -> new LinkedHashMap<>()).putIfAbsent(r.getMember().getId(), r.getMember());
        }
        Map<Household, Collection<Member>> grouped = new LinkedHashMap<>();
        byId.forEach((h, people) -> grouped.put(h, people.values()));
        return grouped;
    }

    private FormHousehold toFormHousehold(Household h, Collection<Member> people) {
        String address = h.cityDistrict() + (h.getAddress() == null ? "" : h.getAddress());
        return new FormHousehold(h.getHouseholdNumber(), headName(h), address, people.stream().map(this::toFormPerson).toList());
    }

    private FormPerson toFormPerson(Member m) {
        return new FormPerson(m.getName(), m.getGender(), m.getBirthGanzhi(), m.isBirthMonthIsLeap(), m.getBirthMonth(), m.getBirthDay(),
            m.getBirthHourBranch());
    }

    private String headName(Household h) {
        return members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(h.getId()).map(Member::getName).orElse(null);
    }
}
