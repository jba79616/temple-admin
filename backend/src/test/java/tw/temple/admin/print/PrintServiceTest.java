package tw.temple.admin.print;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.light.LightCategory;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderService;
import tw.temple.admin.print.PrintService.ApplicationForm;
import tw.temple.admin.print.PrintService.Cards;
import tw.temple.admin.print.PrintService.FormHousehold;
import tw.temple.admin.print.PrintService.FormPerson;
import tw.temple.admin.print.PrintService.FormScope;
import tw.temple.admin.print.PrintService.NameList;
import tw.temple.admin.systemconfig.ConfigService;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class PrintServiceTest {

    @Autowired PrintService print;
    @Autowired HouseholdService households;
    @Autowired OrderService orders;
    @Autowired LightTypeRepository lightTypes;
    @Autowired UserRepository users;
    @Autowired ConfigService config;

    private static MemberInput member(String name, String ganzhi, Integer month, boolean leap, Integer day, String hour) {
        return new MemberInput(name, "M", null, null, null, null, ganzhi, month, leap, day, hour, null);
    }

    private static FormHousehold find(ApplicationForm form, Household h) {
        return form.households().stream().filter(x -> x.householdNumber().equals(h.getHouseholdNumber())).findFirst().orElseThrow();
    }

    @Test
    void buildsApplicationFormsFromAYearsRecords() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household lit = households.create(new HouseholdInput("新北市", "三重區", "重新路1號", null, null, null,
            member("王申報", "甲戌", 4, true, 2, "子")), admin);
        households.addMember(lit.getId(), member("王沒安", "乙亥", null, false, null, null), admin);
        Household dark = households.create(new HouseholdInput(null, null, null, null, null, null,
            member("李全部", null, null, false, null, null)), admin);
        Long headId = households.detail(lit.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        var caiku = lightTypes.findByName("補財庫").orElseThrow();
        orders.createCounter(new CreateOrderRequest(year, lit.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null),
                new ItemInput(headId, caiku.getId(), ItemAction.ADD, null, null))), admin);

        ApplicationForm all = print.applicationForm(FormScope.ALL, year);
        assertThat(all.title()).isEqualTo("參加安斗申報單");
        assertThat(all.baguaTypes()).isEmpty();
        assertThat(all.households()).extracting(FormHousehold::householdNumber)
            .contains(lit.getHouseholdNumber(), dark.getHouseholdNumber());
        FormHousehold litAll = find(all, lit);
        assertThat(litAll.people()).extracting(FormPerson::name).containsExactly("王申報", "王沒安");
        assertThat(litAll.headName()).isEqualTo("王申報");
        assertThat(litAll.address()).isEqualTo("新北市三重區重新路1號");
        FormPerson p = litAll.people().get(0);
        assertThat(p.ganzhi()).isEqualTo("甲戌");
        assertThat(p.leap()).isTrue();
        assertThat(p.month()).isEqualTo((short) 4);
        assertThat(p.day()).isEqualTo((short) 2);
        assertThat(p.hour()).isEqualTo("子");

        ApplicationForm litForm = print.applicationForm(FormScope.LIT, year);
        assertThat(litForm.households()).extracting(FormHousehold::householdNumber)
            .contains(lit.getHouseholdNumber()).doesNotContain(dark.getHouseholdNumber());
        assertThat(find(litForm, lit).people()).extracting(FormPerson::name).containsExactly("王申報");

        ApplicationForm bagua = print.applicationForm(FormScope.BAGUA, year);
        assertThat(bagua.title()).isEqualTo("八卦轉運斗");
        assertThat(bagua.baguaTypes()).hasSize(22);
        assertThat(bagua.baguaTypes().get(0).code()).isEqualTo("01");
        assertThat(bagua.baguaTypes().get(0).name()).isEqualTo("補財庫");
        assertThat(bagua.baguaTypes().get(21).name()).isEqualTo("制太陰");
        assertThat(find(bagua, lit).people()).extracting(FormPerson::name).containsExactly("王申報");

        Cards cards = print.cardsByYear(year, null, LightCategory.BAGUA);
        assertThat(cards.lightTypeName()).isEqualTo("八卦轉運斗");
        assertThat(cards.cards()).anySatisfy(c -> {
            assertThat(c.name()).isEqualTo("王申報");
            assertThat(c.shortName()).isEqualTo("八卦轉運斗");
            assertThat(c.detail()).isEqualTo("補財庫");
        });
        assertThat(print.cardsByYear(year, guangming.getId(), null).cards()).anySatisfy(c -> {
            assertThat(c.name()).isEqualTo("王申報");
            assertThat(c.shortName()).isEqualTo("光明");
            assertThat(c.detail()).isNull();
        });

        NameList list = print.nameList(year, null, LightCategory.BAGUA);
        assertThat(list.title()).isEqualTo("安奉 八卦轉運斗 善信名單");
        assertThat(list.groups()).anySatisfy(g -> {
            assertThat(g.householdNumber()).isEqualTo(lit.getHouseholdNumber());
            assertThat(g.rows()).extracting(r -> r.name()).containsExactly("王申報");
        });
    }

    @Test
    void deletedMembersAreLeftOutOfPrintsAndHouseholdCounts() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household h = households.create(new HouseholdInput("新北市", "三重區", "重新路9號", null, null, null,
            member("陳在籍", "甲戌", 4, false, 2, "子")), admin);
        households.addMember(h.getId(), member("陳已刪", "乙亥", null, false, null, null), admin);
        var views = households.detail(h.getId(), null).members();
        Long headId = views.get(0).id();
        Long goneId = views.stream().filter(m -> m.name().equals("陳已刪")).findFirst().orElseThrow().id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null),
                new ItemInput(goneId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        households.deleteMember(goneId, "重複建檔", null, admin);

        assertThat(print.cardsByYear(year, guangming.getId(), null).cards()).extracting(c -> c.name())
            .contains("陳在籍").doesNotContain("陳已刪");
        NameList list = print.nameList(year, guangming.getId(), null);
        assertThat(list.groups()).filteredOn(g -> g.householdNumber().equals(h.getHouseholdNumber())).singleElement()
            .satisfies(g -> assertThat(g.rows()).singleElement().satisfies(r -> {
                assertThat(r.name()).isEqualTo("陳在籍");
                assertThat(List.of(r.birthYear(), r.birthMonth(), r.birthDay(), r.birthHour())).containsExactly("甲戌", "4", "2", "子");
            }));
        assertThat(find(print.applicationForm(FormScope.LIT, year), h).people()).extracting(FormPerson::name).containsExactly("陳在籍");
        assertThat(households.search(String.valueOf(h.getHouseholdNumber()))).singleElement()
            .satisfies(s -> assertThat(s.lanternCount()).isEqualTo(1));
    }

    @Test
    void voidedOrderHasNoCardsToPrint() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household h = households.create(new HouseholdInput(null, null, null, null, null, null,
            member("周作廢", "丙子", 1, false, 1, "丑")), admin);
        Long headId = households.detail(h.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        LightOrder order = orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null))), admin);
        assertThat(print.cardsByOrder(order.getId()).cards()).extracting(c -> c.name()).containsExactly("周作廢");

        orders.voidOrder(order.getId(), "開錯", admin);

        assertThatThrownBy(() -> print.cardsByOrder(order.getId())).hasMessageContaining("已作廢");
    }
}
