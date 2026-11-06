package tw.temple.admin.print;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
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

    public record PersonRow(String name, String gender, String birthText, String address) {
    }

    public record HouseholdGroup(Integer householdNumber, String headName, List<PersonRow> rows) {
    }

    public record NameList(String templeName, int year, int rocYear, String ganzhiYear, String lightTypeName, String title,
                           String prayerMonth, boolean all, List<HouseholdGroup> groups) {
    }

    public record Card(String shortName, String name, String cityDistrict, String address) {
    }

    public record Cards(String templeName, int year, int rocYear, String lightTypeName, List<Card> cards) {
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

    public NameList nameList(Integer yearParam, Long lightTypeId, boolean all) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        LightType type = lightTypes.findById(lightTypeId).orElseThrow(() -> ApiException.notFound("找不到燈種"));
        Map<Household, List<Member>> grouped = new LinkedHashMap<>();
        if (all) {
            for (Member m : members.findAllActiveOrdered()) {
                grouped.computeIfAbsent(m.getHousehold(), k -> new ArrayList<>()).add(m);
            }
        } else {
            List<AnnualLightRecord> active = new ArrayList<>(records.findByYearAndLightTypeIdAndActiveTrue(year, type.getId()));
            active.sort(Comparator.comparing((AnnualLightRecord r) -> r.getHousehold().getHouseholdNumber())
                .thenComparing(r -> r.getMember().getSortOrder())
                .thenComparing(r -> r.getMember().getId()));
            for (AnnualLightRecord r : active) {
                grouped.computeIfAbsent(r.getHousehold(), k -> new ArrayList<>()).add(r.getMember());
            }
        }
        List<HouseholdGroup> groups = grouped.entrySet().stream()
            .map(e -> new HouseholdGroup(e.getKey().getHouseholdNumber(), headName(e.getKey()), e.getValue().stream().map(this::toRow).toList()))
            .toList();
        return new NameList(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), Ganzhi.ofYear(year), type.getName(),
            "安奉 " + type.getName() + " 善信名單", config.get(ConfigService.PRAYER_MONTH), all, groups);
    }

    public Cards cardsByYear(Integer yearParam, Long lightTypeId) {
        int year = yearParam == null ? config.currentYear() : yearParam;
        LightType type = lightTypes.findById(lightTypeId).orElseThrow(() -> ApiException.notFound("找不到燈種"));
        List<AnnualLightRecord> active = new ArrayList<>(records.findByYearAndLightTypeIdAndActiveTrue(year, type.getId()));
        active.sort(Comparator.comparing((AnnualLightRecord r) -> r.getHousehold().getHouseholdNumber())
            .thenComparing(r -> r.getMember().getSortOrder())
            .thenComparing(r -> r.getMember().getId()));
        List<Card> cards = active.stream().map(r -> toCard(type, r.getMember())).toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), year, Ganzhi.roc(year), type.getName(), cards);
    }

    public Cards cardsByOrder(Long orderId) {
        LightOrder order = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("找不到單據"));
        List<Card> cards = items.findByOrderIdOrderByIdAsc(orderId).stream()
            .filter(i -> i.getAction() == ItemAction.ADD && i.getOverrideReason() == null || i.getAction() == ItemAction.ADD)
            .map(i -> toCard(i.getLightType(), i.getMember()))
            .toList();
        return new Cards(config.get(ConfigService.TEMPLE_NAME), order.getYear(), Ganzhi.roc(order.getYear()), null, cards);
    }

    private PersonRow toRow(Member m) {
        return new PersonRow(m.getName(), m.getGender(), m.birthText(), m.printCityDistrict() + m.printAddress());
    }

    private Card toCard(LightType type, Member m) {
        return new Card(type.getShortName(), m.getName(), m.printCityDistrict(), m.printAddress());
    }

    private String headName(Household h) {
        return members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(h.getId()).map(Member::getName).orElse(null);
    }
}
