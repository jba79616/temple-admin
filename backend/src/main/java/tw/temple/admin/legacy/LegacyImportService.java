package tw.temple.admin.legacy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.systemconfig.ConfigService;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdFields;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberFields;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.household.TaiwanAddress;
import tw.temple.admin.household.TaiwanAddress.Split;
import tw.temple.admin.legacy.MysqlDumpParser.Table;
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
import tw.temple.admin.order.Payment;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;
import tw.temple.admin.user.User;

/**
 * 把舊系統（MariaDB，people 一人一列、每年四個燈的勾選欄）的 mysqldump 轉進新 schema。
 * 預覽模式會真的跑完整個流程再整筆 rollback，所以 DB 的約束檢查也會在預覽時就報出來。
 * 可重跑：戶與成員依 legacy_id 更新，已存在的年度紀錄不再補單；新系統已有的戶長與聯絡備註不動。
 * 舊系統標 is_deleted 的人也進戶，建成軟刪除成員；歷年安燈紀錄照補（舊系統的 view 不列他們，但勾選仍在表裡）。
 */
@Service
public class LegacyImportService {

    public enum IssueKind { ADDRESS, DISTRICT, HEAD, BIRTH, PERSON, ORDER }

    public record Issue(IssueKind kind, Integer householdNumber, String name, String detail) {
    }

    public record YearCount(int year, int rocYear, int guangming, int wenchang, int taisui, int bagua) {
    }

    public record Counts(int people, int deleted, int households, int householdsCreated, int householdsUpdated,
                         int membersCreated, int membersUpdated, int orders, int items, int deletedItems, int payments,
                         int recordsExisting, int addressesSplit, int addressesPartial, int addressesUnparsed) {
    }

    public record Report(boolean committed, Counts counts, List<YearCount> years, List<Issue> issues) {
    }

    private enum Lamp {
        GUANGMING("guangming", "光明燈"), WENCHANG("wenchang", "文昌燈"), TAISUI("taisui", "太歲燈"), BAGUA("bagua", "八卦轉運斗");

        private final String column;
        private final String legacyName;

        Lamp(String column, String legacyName) {
            this.column = column;
            this.legacyName = legacyName;
        }

        static Lamp ofColumn(String column) {
            for (Lamp lamp : values()) {
                if (lamp.column.equals(column)) {
                    return lamp;
                }
            }
            throw new IllegalArgumentException(column);
        }
    }

    private record Birth(String ganzhi, Integer month, boolean leap, Integer day, String hour) {
    }

    private record Person(int id, Integer householdNumber, boolean headFlag, Integer order, String name, String gender, Split address,
                          String headName, String phone, String remark, Birth birth, Map<Integer, EnumSet<Lamp>> lamps,
                          OffsetDateTime deletedAt) {
        boolean deleted() {
            return deletedAt != null;
        }
    }

    private record HouseholdPlan(int number, Person head, List<Person> people) {
        Person anchor() {
            return head != null ? head : people.get(0);
        }
    }

    private static final class Tally {
        int people;
        int deleted;
        int households;
        int householdsCreated;
        int householdsUpdated;
        int membersCreated;
        int membersUpdated;
        int orders;
        int items;
        int deletedItems;
        int payments;
        int recordsExisting;
        int addressesSplit;
        int addressesPartial;
        int addressesUnparsed;

        Counts toCounts() {
            return new Counts(people, deleted, households, householdsCreated, householdsUpdated, membersCreated, membersUpdated,
                orders, items, deletedItems, payments, recordsExisting, addressesSplit, addressesPartial, addressesUnparsed);
        }
    }

    private record LampTargets(Map<Integer, Member> members, Map<Lamp, LightType> types, Map<Lamp, Integer> prices,
                               Set<String> existing) {
    }

    /** 一戶一年一張匯入單；只有真的寫入明細時才建單。 */
    private static final class ImportOrder {
        final Household household;
        final int year;
        final LocalDate date;
        LightOrder saved;
        int due;

        ImportOrder(Household household, int year) {
            this.household = household;
            this.year = year;
            this.date = LocalDate.of(year, 1, 1);
        }
    }

    private static final Pattern FLAG_COLUMN = Pattern.compile("^(guangming|wenchang|taisui|bagua)(\\d{3})$");
    private static final String BAGUA_LEGACY_CODE = "bagua";
    private static final String UNKNOWN = "吉";
    private static final String IMPORT_NOTE = "舊系統匯入";
    private static final String DELETED_REASON = "舊系統已刪除";
    private static final int NAME_MAX = 50;
    private static final int ADDRESS_MAX = 200;
    private static final int PHONE_MAX = 20;
    private static final Comparator<Person> BY_ORDER_THEN_ID =
        Comparator.comparing(Person::order, Comparator.nullsLast(Comparator.naturalOrder())).thenComparingInt(Person::id);

    private final HouseholdRepository households;
    private final MemberRepository members;
    private final LightTypeRepository lightTypes;
    private final LightOrderRepository orders;
    private final LightOrderItemRepository items;
    private final PaymentRepository payments;
    private final AnnualLightRecordRepository records;
    private final ConfigService config;
    private final TempleClock clock;
    private final EntityManager em;

    public LegacyImportService(HouseholdRepository households, MemberRepository members, LightTypeRepository lightTypes,
                               LightOrderRepository orders, LightOrderItemRepository items, PaymentRepository payments,
                               AnnualLightRecordRepository records, ConfigService config, TempleClock clock, EntityManager em) {
        this.households = households;
        this.members = members;
        this.lightTypes = lightTypes;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.records = records;
        this.config = config;
        this.clock = clock;
        this.em = em;
    }

    @Transactional
    public Report run(String sql, User actor, boolean commit) {
        Map<String, Table> tables = new MysqlDumpParser(sql).tables();
        Table people = tables.get("people");
        if (people == null) {
            throw ApiException.badRequest("dump 裡沒有 people 資料表");
        }
        List<Integer> years = years(people.columns());
        if (years.isEmpty()) {
            throw ApiException.badRequest("people 沒有任何年度安燈欄位（guangming110 這類）");
        }
        Map<Lamp, LightType> types = resolveTypes();
        Map<Lamp, Integer> prices = prices(tables.get("lamp"), types);

        List<Issue> issues = new ArrayList<>();
        Tally tally = new Tally();
        List<Person> persons = people.rows().stream().map(row -> toPerson(row, issues)).filter(Objects::nonNull).toList();
        tally.people = persons.size();
        tally.deleted = (int) persons.stream().filter(Person::deleted).count();
        List<HouseholdPlan> plans = plan(persons, issues, tally);
        tally.households = plans.size();

        Map<Integer, Household> householdsByNumber = writeHouseholds(plans, issues, tally);
        Map<Integer, Member> membersByLegacyId = writeMembers(plans, householdsByNumber, issues, tally);
        writeRecords(plans, years, householdsByNumber, membersByLegacyId, types, prices, actor, tally);
        em.flush();
        if (commit) {
            resetHouseholdNumberSequence();
        } else {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
        issues.sort(Comparator.comparing(Issue::householdNumber, Comparator.nullsLast(Comparator.naturalOrder())));
        return new Report(commit, tally.toCounts(), yearCounts(persons, years), List.copyOf(issues));
    }

    private List<Integer> years(List<String> columns) {
        return columns.stream()
            .map(FLAG_COLUMN::matcher)
            .filter(Matcher::matches)
            .map(m -> Integer.parseInt(m.group(2)) + 1911)
            .distinct()
            .sorted()
            .toList();
    }

    private Map<Lamp, LightType> resolveTypes() {
        Map<Lamp, LightType> types = new EnumMap<>(Lamp.class);
        for (Lamp lamp : Lamp.values()) {
            Optional<LightType> type = lamp == Lamp.BAGUA ? lightTypes.findByLegacyCode(BAGUA_LEGACY_CODE) : lightTypes.findByName(lamp.legacyName);
            types.put(lamp, type.orElseThrow(() -> ApiException.badRequest("找不到燈種「" + lamp.legacyName + "」"
                + (lamp == Lamp.BAGUA ? "（legacy_code = bagua）" : "") + "，請先在燈種管理建立")));
        }
        return types;
    }

    private Map<Lamp, Integer> prices(Table lamp, Map<Lamp, LightType> types) {
        Map<String, Integer> byName = new HashMap<>();
        if (lamp != null) {
            for (Map<String, String> row : lamp.rows()) {
                if (row.get("name") != null && row.get("price") != null) {
                    byName.put(row.get("name").trim(), parsePrice(row.get("name"), row.get("price")));
                }
            }
        }
        Map<Lamp, Integer> prices = new EnumMap<>(Lamp.class);
        for (Lamp l : Lamp.values()) {
            prices.put(l, byName.getOrDefault(l.legacyName, types.get(l).getPrice()));
        }
        return prices;
    }

    private int parsePrice(String name, String raw) {
        try {
            return new BigDecimal(raw.trim()).intValue();
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("lamp 表「" + name + "」的價格「" + raw + "」不是數字");
        }
    }

    private Person toPerson(Map<String, String> row, List<Issue> issues) {
        Integer id = parseInt(row.get("id"));
        if (id == null) {
            throw ApiException.badRequest("people 有一列的 id 不是數字：" + row.get("id"));
        }
        Integer householdNumber = parseInt(row.get("household_number"));
        OffsetDateTime deletedAt = "1".equals(row.get("is_deleted")) ? deletedAtFromLastUpdate(row) : null;
        List<Issue> sink = deletedAt == null ? issues : new ArrayList<>();
        String name = cleanName(row.get("username"));
        if (householdNumber == null) {
            issues.add(new Issue(IssueKind.PERSON, null, name, "舊資料 id " + id + " 沒有戶號，略過"));
            return null;
        }
        if (name.isEmpty()) {
            issues.add(new Issue(IssueKind.PERSON, householdNumber, null, "舊資料 id " + id + " 姓名空白，略過"));
            return null;
        }
        if (name.contains("?") || name.contains("？")) {
            sink.add(new Issue(IssueKind.PERSON, householdNumber, name, "姓名含無法辨識的字，請人工更正"));
        }
        String gender = switch (clean(row.get("sex"))) {
            case "男" -> "M";
            case "女" -> "F";
            case "" -> null;
            default -> {
                sink.add(new Issue(IssueKind.PERSON, householdNumber, name, "性別「" + row.get("sex") + "」無法辨識，存空值"));
                yield null;
            }
        };
        Map<Integer, EnumSet<Lamp>> lamps = lamps(row);
        return new Person(id, householdNumber, "1".equals(row.get("ishouseholdhead")), parseInt(row.get("people_order")), name, gender,
            TaiwanAddress.split(row.get("address")), cleanName(row.get("householdhead")), blankToNull(row.get("phone")),
            blankToNull(row.get("remark")), parseBirth(row, householdNumber, name, sink), lamps, deletedAt);
    }

    private Map<Integer, EnumSet<Lamp>> lamps(Map<String, String> row) {
        Map<Integer, EnumSet<Lamp>> lamps = new TreeMap<>();
        for (Map.Entry<String, String> cell : row.entrySet()) {
            Matcher m = FLAG_COLUMN.matcher(cell.getKey());
            if (m.matches() && flag(cell.getValue())) {
                lamps.computeIfAbsent(Integer.parseInt(m.group(2)) + 1911, k -> EnumSet.noneOf(Lamp.class)).add(Lamp.ofColumn(m.group(1)));
            }
        }
        return lamps;
    }

    private OffsetDateTime deletedAtFromLastUpdate(Map<String, String> row) {
        return parseDateTime(row.get("update_time"))
            .filter(t -> t.getYear() >= 2000)
            .map(t -> t.atZone(clock.zone()).toOffsetDateTime())
            .orElseGet(clock::now);
    }

    private Birth parseBirth(Map<String, String> row, int householdNumber, String name, List<Issue> issues) {
        String ganzhi = clean(row.get("lunar_year"));
        if (!ganzhi.isEmpty() && !Ganzhi.isValid(ganzhi)) {
            if (!UNKNOWN.equals(ganzhi)) {
                issues.add(new Issue(IssueKind.BIRTH, householdNumber, name, "干支年「" + ganzhi + "」不是六十甲子，存空值"));
            }
            ganzhi = "";
        }
        Integer month = parseRange(row.get("lunar_month"), 1, 12, "月", householdNumber, name, issues);
        Integer day = parseRange(row.get("lunar_day"), 1, 30, "日", householdNumber, name, issues);
        String hour = clean(row.get("lunar_hour"));
        if (hour.length() == 2 && hour.endsWith("時")) {
            hour = hour.substring(0, 1);
        }
        if (!hour.isEmpty() && (hour.length() != 1 || Ganzhi.BRANCHES.indexOf(hour) < 0)) {
            if (!UNKNOWN.equals(hour)) {
                issues.add(new Issue(IssueKind.BIRTH, householdNumber, name, "時辰「" + hour + "」不是十二地支，存空值"));
            }
            hour = "";
        }
        boolean leap = "1".equals(row.get("leap_month"));
        if (leap && month == null) {
            issues.add(new Issue(IssueKind.BIRTH, householdNumber, name, "標了閏月但沒有月份，閏月不存"));
            leap = false;
        }
        return new Birth(blankToNull(ganzhi), month, leap, day, blankToNull(hour));
    }

    private Integer parseRange(String raw, int min, int max, String label, int householdNumber, String name, List<Issue> issues) {
        String value = clean(raw);
        if (value.isEmpty() || UNKNOWN.equals(value)) {
            return null;
        }
        Integer parsed = parseInt(value);
        if (parsed == null || parsed < min || parsed > max) {
            issues.add(new Issue(IssueKind.BIRTH, householdNumber, name, label + "「" + value + "」不在 " + min + " 到 " + max + "，存空值"));
            return null;
        }
        return parsed;
    }

    private List<HouseholdPlan> plan(List<Person> persons, List<Issue> issues, Tally tally) {
        Map<Integer, List<Person>> byNumber = persons.stream()
            .collect(Collectors.groupingBy(Person::householdNumber, TreeMap::new, Collectors.toList()));
        List<HouseholdPlan> plans = new ArrayList<>();
        for (Map.Entry<Integer, List<Person>> e : byNumber.entrySet()) {
            int number = e.getKey();
            List<Person> active = e.getValue().stream().filter(p -> !p.deleted()).sorted(BY_ORDER_THEN_ID).toList();
            List<Person> deleted = e.getValue().stream().filter(Person::deleted).sorted(BY_ORDER_THEN_ID).toList();
            HouseholdPlan plan = new HouseholdPlan(number, chooseHead(number, active, issues), Stream.concat(active.stream(), deleted.stream()).toList());
            Person anchor = plan.anchor();
            classifyAddress(number, anchor, tally, issues);
            for (Person p : active) {
                if (p != anchor && hasOwnAddress(p, anchor)) {
                    classifyAddress(number, p, tally, issues);
                }
            }
            plans.add(plan);
        }
        return plans;
    }

    private Person chooseHead(int number, List<Person> active, List<Issue> issues) {
        if (active.isEmpty()) {
            issues.add(new Issue(IssueKind.HEAD, number, null, "此戶成員在舊系統都已刪除，沒有戶長"));
            return null;
        }
        long orders = active.stream().map(Person::order).filter(Objects::nonNull).count();
        if (active.stream().map(Person::order).filter(Objects::nonNull).distinct().count() < orders) {
            issues.add(new Issue(IssueKind.ORDER, number, null, "成員順序有重複，依舊系統 id 重新編號"));
        }
        List<Person> flagged = active.stream().filter(Person::headFlag).toList();
        Person head = flagged.isEmpty() ? active.get(0) : flagged.get(0);
        if (flagged.isEmpty()) {
            issues.add(new Issue(IssueKind.HEAD, number, head.name(), "舊資料沒有標戶長，以第一位成員為戶長"));
        } else if (flagged.size() > 1) {
            issues.add(new Issue(IssueKind.HEAD, number, head.name(), "舊資料標了 " + flagged.size() + " 位戶長（"
                + flagged.stream().map(Person::name).collect(Collectors.joining("、")) + "），取第一位"));
        }
        legacyHeadName(active).filter(n -> active.stream().noneMatch(p -> p.name().equals(n)))
            .ifPresent(n -> issues.add(new Issue(IssueKind.HEAD, number, head.name(), "舊資料的戶長名「" + n + "」不在成員裡")));
        return head;
    }

    private Optional<String> legacyHeadName(List<Person> people) {
        return people.stream().map(Person::headName).filter(n -> n != null && !n.isEmpty())
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))
            .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey);
    }

    private void classifyAddress(int number, Person p, Tally tally, List<Issue> issues) {
        Split a = p.address();
        if (a.raw() == null) {
            tally.addressesUnparsed++;
            issues.add(new Issue(IssueKind.ADDRESS, number, p.name(), "沒有地址"));
        } else if (!a.hasCity()) {
            tally.addressesUnparsed++;
            issues.add(new Issue(IssueKind.ADDRESS, number, p.name(), "拆不出縣市，整段放街路門牌：" + a.raw()));
        } else if (!a.hasDistrict()) {
            tally.addressesPartial++;
            issues.add(new Issue(IssueKind.DISTRICT, number, p.name(), "有縣市沒有鄉鎮市區：" + a.raw()));
        } else {
            tally.addressesSplit++;
            if (a.districtGuessed()) {
                issues.add(new Issue(IssueKind.DISTRICT, number, p.name(), "鄉鎮市區依尾字推成「" + a.district() + "」，請核對：" + a.raw()));
            }
        }
    }

    private boolean hasOwnAddress(Person p, Person anchor) {
        String own = p.address().raw() == null ? null : TaiwanAddress.normalize(p.address().raw());
        String anchors = anchor.address().raw() == null ? null : TaiwanAddress.normalize(anchor.address().raw());
        return own != null && !own.equals(anchors);
    }

    private Map<Integer, Household> writeHouseholds(List<HouseholdPlan> plans, List<Issue> issues, Tally tally) {
        Map<Integer, Household> byNumber = households.findAll().stream()
            .collect(Collectors.toMap(Household::getHouseholdNumber, Function.identity()));
        List<Integer> conflicts = plans.stream().map(HouseholdPlan::number)
            .filter(n -> byNumber.containsKey(n) && !Integer.valueOf(n).equals(byNumber.get(n).getLegacyId()))
            .toList();
        if (!conflicts.isEmpty()) {
            String shown = conflicts.stream().limit(10).map(String::valueOf).collect(Collectors.joining("、"));
            throw ApiException.conflict("戶號 " + shown + (conflicts.size() > 10 ? " 等 " + conflicts.size() + " 戶" : "")
                + " 已被現有資料使用，不能匯入；請在空的資料庫匯入");
        }
        for (HouseholdPlan plan : plans) {
            HouseholdFields fields = householdFields(plan, issues);
            Household existing = byNumber.get(plan.number());
            if (existing != null) {
                existing.update(new HouseholdFields(fields.city(), fields.district(), fields.address(), fields.phone(),
                    existing.getContactNote(), fields.notes()));
                tally.householdsUpdated++;
            } else {
                insertHousehold(plan.number(), fields);
                tally.householdsCreated++;
            }
        }
        return households.findByLegacyIdIsNotNull().stream().collect(Collectors.toMap(Household::getLegacyId, Function.identity()));
    }

    private HouseholdFields householdFields(HouseholdPlan plan, List<Issue> issues) {
        Person anchor = plan.anchor();
        Split a = anchor.address();
        String address = clip(a.hasCity() ? a.street() : a.raw(), ADDRESS_MAX, "地址", plan.number(), anchor.name(), issues);
        String phone = clip(anchor.phone(), PHONE_MAX, "電話", plan.number(), anchor.name(), issues);
        Map<String, List<String>> remarks = new LinkedHashMap<>();
        for (Person p : plan.people()) {
            if (p.remark() != null) {
                remarks.computeIfAbsent(p.remark(), k -> new ArrayList<>()).add(p.name());
            }
        }
        String notes = remarks.isEmpty() ? null : remarks.entrySet().stream()
            .map(e -> String.join("、", e.getValue()) + "：" + e.getKey())
            .collect(Collectors.joining("\n"));
        return new HouseholdFields(a.city(), a.district(), address, phone, null, notes);
    }

    private void insertHousehold(int number, HouseholdFields f) {
        em.createNativeQuery("""
                insert into households (household_number, city, district, address, phone, notes, legacy_id)
                values (?1, ?2, ?3, ?4, ?5, ?6, ?1)
                """)
            .setParameter(1, number)
            .setParameter(2, f.city())
            .setParameter(3, f.district())
            .setParameter(4, f.address())
            .setParameter(5, f.phone())
            .setParameter(6, f.notes())
            .executeUpdate();
    }

    private Map<Integer, Member> writeMembers(List<HouseholdPlan> plans, Map<Integer, Household> householdsByNumber, List<Issue> issues,
                                              Tally tally) {
        Map<Integer, Member> existing = members.findByLegacyIdIsNotNull().stream()
            .collect(Collectors.toMap(Member::getLegacyId, Function.identity()));
        Map<Long, Member> currentHeads = currentHeads(householdsByNumber.values());
        Map<Integer, Member> result = new HashMap<>();
        for (HouseholdPlan plan : plans) {
            Household h = householdsByNumber.get(plan.number());
            Member currentHead = currentHeads.get(h.getId());
            Person currentHeadInDump = currentHead == null ? null : personOf(currentHead, plan);
            if (currentHeadInDump != null && currentHeadInDump.deleted()) {
                issues.add(new Issue(IssueKind.HEAD, plan.number(), currentHead.getName(), "新系統的戶長在舊資料已刪除，改依舊資料重新指定戶長"));
                currentHead.softDelete(DELETED_REASON, currentHeadInDump.deletedAt());
                members.saveAndFlush(currentHead);
                currentHead = null;
            }
            Person newHead = currentHead == null ? headToSet(plan, existing, issues) : null;
            int sortOrder = 0;
            for (Person p : plan.people()) {
                MemberFields fields = memberFields(p, plan.anchor(), ++sortOrder, issues);
                Member m = existing.get(p.id());
                if (m == null) {
                    m = new Member(h, fields, p == newHead);
                    m.linkLegacy(p.id());
                    tally.membersCreated++;
                } else {
                    if (!m.getHousehold().getId().equals(h.getId())) {
                        moveAcrossHouseholds(m, h, plan.number(), issues);
                    }
                    m.update(fields);
                    if (p == newHead) {
                        m.markHead(true);
                    }
                    tally.membersUpdated++;
                }
                if (p.deleted() && !m.isDeleted()) {
                    m.softDelete(DELETED_REASON, p.deletedAt());
                }
                result.put(p.id(), members.save(m));
            }
        }
        return result;
    }

    private Map<Long, Member> currentHeads(Collection<Household> households) {
        List<Long> ids = households.stream().map(Household::getId).toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return members.findByHouseholdIdInAndDeletedAtIsNullOrderBySortOrderAscIdAsc(ids).stream()
            .filter(Member::isHead)
            .collect(Collectors.toMap(m -> m.getHousehold().getId(), Function.identity()));
    }

    private Person personOf(Member m, HouseholdPlan plan) {
        return plan.people().stream().filter(p -> Integer.valueOf(p.id()).equals(m.getLegacyId())).findFirst().orElse(null);
    }

    private Person headToSet(HouseholdPlan plan, Map<Integer, Member> existing, List<Issue> issues) {
        Person head = plan.head();
        if (head == null) {
            return null;
        }
        Member m = existing.get(head.id());
        if (m != null && m.isDeleted()) {
            issues.add(new Issue(IssueKind.HEAD, plan.number(), head.name(), "舊資料的戶長在新系統已刪除，此戶沒有戶長，請自行指定"));
            return null;
        }
        return head;
    }

    private void moveAcrossHouseholds(Member m, Household target, int targetNumber, List<Issue> issues) {
        Integer fromNumber = m.getHousehold().getHouseholdNumber();
        String detail = "舊資料的戶號從 " + fromNumber + " 改成 " + targetNumber + "，成員與今年已安的燈一併移過去，歷年紀錄保留"
            + (m.isHead() ? "；原本在 " + fromNumber + " 戶是戶長，移走後該戶沒有戶長" : "");
        issues.add(new Issue(IssueKind.HEAD, targetNumber, m.getName(), detail));
        m.moveTo(target);
        for (AnnualLightRecord record : records.findByMemberIdAndYearAndActiveTrue(m.getId(), config.currentYear())) {
            record.moveTo(target);
            records.save(record);
        }
    }

    private MemberFields memberFields(Person p, Person anchor, int sortOrder, List<Issue> issues) {
        String city = null;
        String district = null;
        String address = null;
        Integer number = p.householdNumber();
        if (p != anchor && hasOwnAddress(p, anchor)) {
            Split a = p.address();
            city = a.city();
            district = a.district();
            address = clip(a.hasCity() ? a.street() : a.raw(), ADDRESS_MAX, "地址", number, p.name(), issues);
        }
        Birth b = p.birth();
        String name = clip(p.name(), NAME_MAX, "姓名", number, p.name(), issues);
        String phone = clip(p.phone(), PHONE_MAX, "電話", number, p.name(), issues);
        return new MemberFields(name, p.gender(), city, district, address, phone, b.ganzhi(), b.month(), b.leap(), b.day(), b.hour(),
            sortOrder);
    }

    private String clip(String value, int max, String field, Integer number, String name, List<Issue> issues) {
        if (value == null || value.length() <= max) {
            return value;
        }
        issues.add(new Issue(IssueKind.PERSON, number, name, field + "超過 " + max + " 字，只存前 " + max + " 字：" + value));
        return value.substring(0, max);
    }

    private void writeRecords(List<HouseholdPlan> plans, List<Integer> years, Map<Integer, Household> householdsByNumber,
                              Map<Integer, Member> membersByLegacyId, Map<Lamp, LightType> types, Map<Lamp, Integer> prices, User actor,
                              Tally tally) {
        LampTargets targets = new LampTargets(membersByLegacyId, types, prices, existingRecordKeys());
        for (HouseholdPlan plan : plans) {
            Household h = householdsByNumber.get(plan.number());
            for (int year : years) {
                writeHouseholdYear(new ImportOrder(h, year), plan.people(), targets, actor, tally);
            }
        }
    }

    private Set<String> existingRecordKeys() {
        return records.findAll().stream()
            .map(r -> recordKey(r.getMember().getId(), r.getLightType().getId(), r.getYear()))
            .collect(Collectors.toCollection(java.util.HashSet::new));
    }

    private void writeHouseholdYear(ImportOrder order, List<Person> people, LampTargets targets, User actor, Tally tally) {
        for (Person p : people) {
            Member m = targets.members().get(p.id());
            for (Lamp lamp : p.lamps().getOrDefault(order.year, EnumSet.noneOf(Lamp.class))) {
                LightType type = targets.types().get(lamp);
                if (!targets.existing().add(recordKey(m.getId(), type.getId(), order.year))) {
                    tally.recordsExisting++;
                    continue;
                }
                writeLamp(order, m, type, targets.prices().get(lamp), actor, tally);
                if (p.deleted()) {
                    tally.deletedItems++;
                }
            }
        }
        settle(order, tally);
    }

    private void writeLamp(ImportOrder order, Member m, LightType type, int price, User actor, Tally tally) {
        LightOrderItem item = items.save(new LightOrderItem(orderOf(order, actor, tally), m, type, ItemAction.ADD, price, null));
        AnnualLightRecord record = new AnnualLightRecord(order.year, m, type, order.household, price, item);
        record.markCardPrinted(clock.now());
        records.save(record);
        order.due += price;
        tally.items++;
    }

    private LightOrder orderOf(ImportOrder order, User actor, Tally tally) {
        if (order.saved == null) {
            order.saved = orders.save(new LightOrder(OrderKind.IMPORT, order.year, order.household, order.date, order.date, null,
                IMPORT_NOTE + "　民國 " + Ganzhi.roc(order.year) + " 年", actor));
            tally.orders++;
        }
        return order.saved;
    }

    private void settle(ImportOrder order, Tally tally) {
        if (order.saved == null) {
            return;
        }
        order.saved.settleTotalDue(order.due);
        if (order.due > 0) {
            payments.save(new Payment(order.saved, PaymentKind.IMPORT, order.due, order.date, order.date, null, IMPORT_NOTE));
            tally.payments++;
        }
    }

    private void resetHouseholdNumberSequence() {
        em.createNativeQuery("select setval(pg_get_serial_sequence('households', 'household_number'), "
            + "(select max(household_number) from households))").getSingleResult();
    }

    private List<YearCount> yearCounts(List<Person> persons, List<Integer> years) {
        List<YearCount> result = new ArrayList<>();
        for (int year : years) {
            Map<Lamp, Integer> counts = new EnumMap<>(Lamp.class);
            for (Person p : persons) {
                for (Lamp lamp : p.lamps().getOrDefault(year, EnumSet.noneOf(Lamp.class))) {
                    counts.merge(lamp, 1, Integer::sum);
                }
            }
            result.add(new YearCount(year, Ganzhi.roc(year), counts.getOrDefault(Lamp.GUANGMING, 0), counts.getOrDefault(Lamp.WENCHANG, 0),
                counts.getOrDefault(Lamp.TAISUI, 0), counts.getOrDefault(Lamp.BAGUA, 0)));
        }
        return result;
    }

    private String recordKey(Long memberId, Long lightTypeId, int year) {
        return memberId + ":" + lightTypeId + ":" + year;
    }

    private boolean flag(String value) {
        return value != null && !value.isBlank() && !"0".equals(value.trim());
    }

    private Optional<LocalDateTime> parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDateTime.parse(value.trim().replace(' ', 'T')));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    private Integer parseInt(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanName(String value) {
        return clean(value).replace("　", "").replace(" ", "");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
