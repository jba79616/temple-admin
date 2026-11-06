package tw.temple.admin.household;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.audit.AuditLog;
import tw.temple.admin.audit.AuditLogRepository;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.HouseholdSummary;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderService;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class HouseholdServiceTest {

    @Autowired HouseholdService service;
    @Autowired OrderService orderService;
    @Autowired LightTypeRepository lightTypes;
    @Autowired AnnualLightRecordRepository records;
    @Autowired AuditLogRepository auditLogs;
    @Autowired UserRepository users;

    User admin;

    @BeforeEach
    void setUp() {
        admin = users.findByUsername("admin").orElseThrow();
    }

    private static MemberInput member(String name, String phone) {
        return new MemberInput(name, "F", null, null, null, phone, null, null, null, null, null, null);
    }

    @Test
    void searchMatchesHeadMemberPhoneAndNumber() {
        Household h = service.create(new HouseholdInput("新北市", "蘆洲區", "中正路1號", "02-2222-3333", "LINE: lin", null,
            member("林美玉", null)), admin);
        service.addMember(h.getId(), member("林志偉", "0912-345-678"), admin);

        assertThat(service.search("林美玉")).extracting(HouseholdSummary::id).contains(h.getId());
        assertThat(service.search("志偉")).extracting(HouseholdSummary::id).contains(h.getId());
        assertThat(service.search("0912-345")).extracting(HouseholdSummary::id).contains(h.getId());
        assertThat(service.search(String.valueOf(h.getHouseholdNumber()))).extracting(HouseholdSummary::id).containsExactly(h.getId());
        assertThat(service.search("不存在的人")).isEmpty();

        HouseholdSummary summary = service.search("林美玉").stream().filter(s -> s.id().equals(h.getId())).findFirst().orElseThrow();
        assertThat(summary.headName()).isEqualTo("林美玉");
        assertThat(summary.memberCount()).isEqualTo(2);
        assertThat(summary.cityDistrict()).isEqualTo("新北市蘆洲區");
    }

    @Test
    void deletingHeadRequiresNewHeadAndKeepsLanternRecords() {
        Household h = service.create(new HouseholdInput(null, null, null, null, null, null, member("張秀英", null)), admin);
        Long headId = service.detail(h.getId(), null).members().get(0).id();
        Member second = service.addMember(h.getId(), member("張小妹", null), admin);
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        orderService.createCounter(new CreateOrderRequest(null, h.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        assertThatThrownBy(() -> service.deleteMember(headId, "重複建檔", null, admin)).hasMessageContaining("新戶長");

        service.deleteMember(headId, "重複建檔", second.getId(), admin);

        var detail = service.detail(h.getId(), null);
        assertThat(detail.members()).singleElement().satisfies(m -> {
            assertThat(m.name()).isEqualTo("張小妹");
            assertThat(m.head()).isTrue();
        });
        assertThat(detail.records()).singleElement().satisfies(r -> assertThat(r.memberId()).isEqualTo(headId));
    }

    @Test
    void movingMemberCarriesCurrentYearRecords() {
        Household from = service.create(new HouseholdInput(null, null, null, null, null, null, member("陳志強", null)), admin);
        Household to = service.create(new HouseholdInput(null, null, null, null, null, null, member("陳建宏", null)), admin);
        Member moving = service.addMember(from.getId(), member("陳雅婷", null), admin);
        var wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        orderService.createCounter(new CreateOrderRequest(null, from.getId(), null, null, null,
            List.of(new ItemInput(moving.getId(), wenchang.getId(), ItemAction.ADD, null, null))), admin);

        service.moveMember(moving.getId(), to.getId(), admin);

        assertThat(service.detail(from.getId(), null).records()).isEmpty();
        assertThat(service.detail(to.getId(), null).records()).singleElement()
            .satisfies(r -> assertThat(r.memberId()).isEqualTo(moving.getId()));
    }

    @Test
    void memberValidationAndTaisuiLabel() {
        Household h = service.create(new HouseholdInput(null, null, null, null, null, null, member("王阿嬤", null)), admin);
        Long id = service.detail(h.getId(), null).members().get(0).id();
        MemberInput bad = new MemberInput("王阿嬤", "F", null, null, null, null, "甲丑", null, null, null, null, null);
        assertThatThrownBy(() -> service.updateMember(id, bad, admin)).hasMessageContaining("六十甲子");

        MemberInput ok = new MemberInput("王阿嬤", "F", null, null, null, null, "癸未", 4, true, 2, "子", null);
        service.updateMember(id, ok, admin);
        var view = service.memberView(id);
        assertThat(view.zodiac()).isEqualTo("羊");
        assertThat(view.birthBranch()).isEqualTo("未");
        assertThat(view.taisui()).isEqualTo("值太歲");
        assertThat(view.birthText()).isEqualTo("癸未年 閏4月 2日 子時 生");

        List<AuditLog> logs = auditLogs.findByTableNameAndRowIdOrderByIdDesc("members", id);
        assertThat(logs).isNotEmpty();
        assertThat(logs.get(0).getAction()).isEqualTo("UPDATE");
        assertThat(logs.get(0).getAfterData()).startsWith("{").contains("\"birthGanzhi\"");
    }
}
