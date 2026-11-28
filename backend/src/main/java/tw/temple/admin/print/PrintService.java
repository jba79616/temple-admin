package tw.temple.admin.print;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;
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
import tw.temple.admin.order.OrderKind;
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

    /** excludedCount：本單點過、但後來被取消、改由其他單處理或成員已刪除的燈，不印也不能標記。跨戶的單 householdNumber 為 null。 */
    public record Cards(String templeName, int year, int rocYear, String lightTypeName, Integer householdNumber, List<Card> cards,
                        int excludedCount) {
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

    public record WenshuPerson(Long memberId, Integer householdNumber, String name, String gender, String ganzhi, boolean leap, Short month, Short day,
                               String hour, String cityDistrict, String address) {
    }

    /** 制星補運文疏一人一張；天運預設用選的年度干支與祈福文月份。整批印跨很多戶時 householdNumber 是 null。 */
    public record Wenshu(String templeName, String templeAddress, Integer householdNumber, int year, String ganzhiYear,
                         String prayerMonth, List<WenshuPerson> people) {
    }

    /** 戶號區間含頭尾；households 是這批的戶數，people 是張數。 */
    public record WenshuBatch(int fromNumber, int toNumber, int households, int people) {
    }

    private static final int WENSHU_BATCH_HOUSEHOLDS = 200;
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
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), sel.label(), null, cards, 0);
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
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), null, household.getHouseholdNumber(), cards, 0);
    }

    public Cards cardsByOrder(Long orderId) {
        LightOrder order = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("找不到單據"));
        if (!order.isActive()) {
            throw ApiException.badRequest("已作廢的單不能印安燈卡");
        }
        if (order.getKind() == OrderKind.IMPORT) {
            throw ApiException.badRequest("匯入單是舊系統的年度，卡片早已印過；要補印請到戶頁印本戶安燈卡");
        }
        List<LightOrderItem> added = items.findByOrderIdOrderByIdAsc(orderId).stream()
            .filter(i -> i.getAction() == ItemAction.ADD && !i.isReversal())
            .toList();
        List<AnnualLightRecord> printable = added.stream()
            .flatMap(i -> recordActivatedBy(i, order.getYear()).stream())
            .filter(r -> !r.getMember().isDeleted())
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), order.getYear(), Ganzhi.roc(order.getYear()), null,
            householdNumberOf(printable, order), printable.stream().map(this::toCard).toList(), added.size() - printable.size());
    }

    /** 跨戶更正或成員搬戶後，卡片所屬的戶可能不是單據的戶，頁首要寫卡片實際的戶。 */
    private static Integer householdNumberOf(List<AnnualLightRecord> printable, LightOrder order) {
        List<Integer> numbers = printable.stream().map(r -> r.getHousehold().getHouseholdNumber()).distinct().toList();
        if (numbers.isEmpty()) {
            return order.getHousehold().getHouseholdNumber();
        }
        return numbers.size() == 1 ? numbers.get(0) : null;
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

    public Wenshu wenshu(Long householdId, Integer yearParam) {
        Household household = households.findById(householdId).orElseThrow(() -> ApiException.notFound("找不到戶"));
        return wenshuOf(household.getHouseholdNumber(), yearOrCurrent(yearParam),
            headFirst(members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(householdId)));
    }

    /**
     * 列印頁整批印：範圍只決定印哪些戶，選到的戶全戶在籍成員都印，不只該年點燈的人。
     * fromNumber、toNumber 是戶號區間（含頭尾，null 表示不設限），讓全部的戶可以一批一批印。
     */
    public Wenshu wenshuByScope(FormScope scope, Integer yearParam, Integer fromNumber, Integer toNumber) {
        int year = yearOrCurrent(yearParam);
        List<Member> people = chosenHouseholds(scope, year).stream()
            .filter(h -> inRange(h.getFirst().getHousehold().getHouseholdNumber(), fromNumber, toNumber))
            .flatMap(List::stream)
            .toList();
        return wenshuOf(null, year, people);
    }

    /** 一批 WENSHU_BATCH_HOUSEHOLDS 戶，依戶號切；全部的戶有近四千張，一次轉 PDF 要好幾分鐘還佔住轉檔鎖。 */
    public List<WenshuBatch> wenshuBatches(FormScope scope, Integer yearParam) {
        return wenshuBatches(scope, yearParam, WENSHU_BATCH_HOUSEHOLDS);
    }

    List<WenshuBatch> wenshuBatches(FormScope scope, Integer yearParam, int batchSize) {
        if (batchSize <= 0) throw new IllegalArgumentException("batchSize must be positive: " + batchSize);
        List<List<Member>> chosen = chosenHouseholds(scope, yearOrCurrent(yearParam));
        List<WenshuBatch> batches = new ArrayList<>();
        for (int i = 0; i < chosen.size(); i += batchSize) {
            List<List<Member>> batch = chosen.subList(i, Math.min(i + batchSize, chosen.size()));
            batches.add(new WenshuBatch(householdNumberOf(batch.getFirst()), householdNumberOf(batch.getLast()), batch.size(),
                batch.stream().mapToInt(List::size).sum()));
        }
        return batches;
    }

    private int yearOrCurrent(Integer yearParam) {
        return yearParam == null ? config.currentYear() : yearParam;
    }

    /** 依戶號排序，每戶是全戶在籍成員、戶長排第一。 */
    private List<List<Member>> chosenHouseholds(FormScope scope, int year) {
        Map<Household, Collection<Member>> everyone = allByHousehold();
        Set<Long> chosen = (scope == FormScope.ALL ? everyone : litByHousehold(sortedRecords(year, r -> inScope(scope, r)))).keySet().stream()
            .map(Household::getId)
            .collect(Collectors.toSet());
        return everyone.entrySet().stream()
            .filter(e -> chosen.contains(e.getKey().getId()))
            .map(e -> headFirst(e.getValue()))
            .toList();
    }

    private boolean inRange(Integer householdNumber, Integer fromNumber, Integer toNumber) {
        return (fromNumber == null || householdNumber >= fromNumber) && (toNumber == null || householdNumber <= toNumber);
    }

    private int householdNumberOf(List<Member> household) {
        return household.getFirst().getHousehold().getHouseholdNumber();
    }

    private Wenshu wenshuOf(Integer householdNumber, int year, List<Member> people) {
        return new Wenshu(config.get(ConfigService.TEMPLE_NAME), config.get(ConfigService.TEMPLE_ADDRESS), householdNumber,
            year, Ganzhi.ofYear(year), config.get(ConfigService.PRAYER_MONTH), people.stream().map(this::toWenshuPerson).toList());
    }

    private List<Member> headFirst(Collection<Member> household) {
        return household.stream().sorted(Comparator.comparing((Member m) -> !m.isHead())).toList();
    }

    private WenshuPerson toWenshuPerson(Member m) {
        return new WenshuPerson(m.getId(), m.getHousehold().getHouseholdNumber(), m.getName(), m.getGender(), m.getBirthGanzhi(),
            m.isBirthMonthIsLeap(), m.getBirthMonth(), m.getBirthDay(), m.getBirthHourBranch(), m.printCityDistrict(), m.printAddress());
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
        LightType type = r.getLightType();
        Member m = r.getMember();
        boolean bagua = type.getCategory() == LightCategory.BAGUA;
        return new Card(r.getId(), r.getLastOrderItem().getId(), bagua ? BAGUA_LABEL : type.getShortName(),
            bagua ? type.getName() : null, m.getName(), m.printCityDistrict(), m.printAddress());
    }

    private Optional<AnnualLightRecord> recordActivatedBy(LightOrderItem item, int year) {
        return records.findByMemberIdAndLightTypeIdAndYear(item.getMember().getId(), item.getLightType().getId(), year)
            .filter(r -> r.isActive() && r.getLastOrderItem().getId().equals(item.getId()));
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
