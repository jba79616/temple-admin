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
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.light.LightCategory;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.AnnualLightRecord;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.LightOrderItem;
import tw.temple.admin.order.LightOrderItemRepository;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.systemconfig.ConfigService;

@Service
@Transactional(readOnly = true)
public class PrintService {

    public enum FormScope { ALL, LIT, BAGUA }

    public record PersonRow(String name, String gender, String birthYear, String birthMonth, String birthDay, String birthHour,
                            String address) {
    }

    public record HouseholdGroup(Integer householdNumber, List<PersonRow> rows) {
    }

    public record NameList(String templeName, int year, int rocYear, String ganzhiYear, String lightTypeName, String title,
                           String prayerMonth, List<HouseholdGroup> groups) {
    }

    /**
     * recordId 與 orderItemId 給「已印好，標記這批」用：orderItemId 是讓這盞燈生效的明細，燈重點過就對不上，不會被舊頁面標掉。
     * 單據上的燈後來被取消或重點過，recordId 是 null，不能標記。
     */
    public record Card(Long recordId, Long orderItemId, String shortName, String detail, String name, String cityDistrict,
                       String address) {
    }

    public record PrintedCard(Long recordId, Long orderItemId) {
    }

    public record Cards(String templeName, int year, int rocYear, String lightTypeName, Integer householdNumber, List<Card> cards) {
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
    private static final Comparator<AnnualLightRecord> BY_HOUSEHOLD_MEMBER_LIGHT =
        Comparator.comparing((AnnualLightRecord r) -> r.getHousehold().getHouseholdNumber())
            .thenComparing(r -> r.getMember().getSortOrder())
            .thenComparing(r -> r.getMember().getId())
            .thenComparing(r -> r.getLightType().getSortOrder());

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
    private final HouseholdRepository households;
    private final LightTypeRepository lightTypes;
    private final LightOrderRepository orders;
    private final LightOrderItemRepository items;
    private final ConfigService config;
    private final TempleClock clock;

    public PrintService(AnnualLightRecordRepository records, MemberRepository members, HouseholdRepository households,
                        LightTypeRepository lightTypes, LightOrderRepository orders, LightOrderItemRepository items,
                        ConfigService config, TempleClock clock) {
        this.records = records;
        this.members = members;
        this.households = households;
        this.lightTypes = lightTypes;
        this.orders = orders;
        this.items = items;
        this.config = config;
        this.clock = clock;
    }

    public NameList nameList(Integer yearParam, Long lightTypeId, LightCategory category) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        Selection sel = select(lightTypeId, category);
        Map<Household, Collection<Member>> grouped = litByHousehold(sortedRecords(year, sel::matches));
        List<HouseholdGroup> groups = grouped.entrySet().stream()
            .map(e -> new HouseholdGroup(e.getKey().getHouseholdNumber(), e.getValue().stream().map(this::toRow).toList()))
            .toList();
        return new NameList(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), Ganzhi.ofYear(year), sel.label(),
            "安奉 " + sel.label() + " 善信名單", config.get(ConfigService.PRAYER_MONTH), groups);
    }

    public Cards cardsByYear(Integer yearParam, Long lightTypeId, LightCategory category, boolean unprintedOnly) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        Selection sel = select(lightTypeId, category);
        List<Card> cards = sortedRecords(year, r -> sel.matches(r) && (!unprintedOnly || r.getCardPrintedAt() == null)).stream()
            .map(this::toCard)
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), sel.label(), null, cards);
    }

    /** 資料改了或卡印壞、弄丟時補印用：這戶該年所有有效的燈，不管印過沒。 */
    public Cards cardsByHousehold(Long householdId, Integer yearParam) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        Household household = households.findById(householdId).orElseThrow(() -> ApiException.notFound("找不到戶"));
        List<Card> cards = records.findByHouseholdIdAndYearAndActiveTrue(householdId, year).stream()
            .filter(r -> !r.getMember().isDeleted())
            .sorted(BY_HOUSEHOLD_MEMBER_LIGHT)
            .map(this::toCard)
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), null, household.getHouseholdNumber(), cards);
    }

    public Cards cardsByOrder(Long orderId) {
        LightOrder order = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("找不到單據"));
        if (!order.isActive()) {
            throw ApiException.badRequest("已作廢的單不能印安燈卡");
        }
        List<Card> cards = items.findByOrderIdOrderByIdAsc(orderId).stream()
            .filter(i -> i.getAction() == ItemAction.ADD && !i.isReversal())
            .map(i -> toCard(recordActivatedBy(i, order.getYear()), i.getId(), i.getLightType(), i.getMember()))
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), order.getYear(), Ganzhi.roc(order.getYear()), null,
            order.getHousehold().getHouseholdNumber(), cards);
    }

    @Transactional
    public int markCardsPrinted(List<PrintedCard> cards) {
        if (cards == null || cards.isEmpty()) {
            throw ApiException.badRequest("沒有要標記的卡片");
        }
        return records.markCardPrinted(cards.stream().map(PrintedCard::recordId).toArray(Long[]::new),
            cards.stream().map(PrintedCard::orderItemId).toArray(Long[]::new), clock.now());
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
        String month = (m.isBirthMonthIsLeap() ? "閏" : "") + orUnknown(m.getBirthMonth());
        return new PersonRow(m.getName(), m.getGender(), orUnknown(m.getBirthGanzhi()), month, orUnknown(m.getBirthDay()),
            orUnknown(m.getBirthHourBranch()), m.printCityDistrict() + m.printAddress());
    }

    private static String orUnknown(Object birthPart) {
        return birthPart == null ? "吉" : birthPart.toString();
    }

    private Card toCard(AnnualLightRecord r) {
        return toCard(r.getId(), r.getLastOrderItem().getId(), r.getLightType(), r.getMember());
    }

    private Card toCard(Long recordId, Long orderItemId, LightType type, Member m) {
        boolean bagua = type.getCategory() == LightCategory.BAGUA;
        return new Card(recordId, orderItemId, bagua ? BAGUA_LABEL : type.getShortName(), bagua ? type.getName() : null,
            m.getName(), m.printCityDistrict(), m.printAddress());
    }

    private Long recordActivatedBy(LightOrderItem item, int year) {
        return records.findByMemberIdAndLightTypeIdAndYear(item.getMember().getId(), item.getLightType().getId(), year)
            .filter(r -> r.isActive() && r.getLastOrderItem().getId().equals(item.getId()))
            .map(AnnualLightRecord::getId)
            .orElse(null);
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
        return records.findByYearAndActiveTrueAndMemberDeletedAtIsNull(year).stream().filter(filter).sorted(BY_HOUSEHOLD_MEMBER_LIGHT).toList();
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
