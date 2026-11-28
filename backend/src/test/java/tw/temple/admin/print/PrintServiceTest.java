package tw.temple.admin.print;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.light.LightCategory;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.LightOrder;
import tw.temple.admin.order.OrderDtos.CreateCorrectionRequest;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderService;
import tw.temple.admin.order.Settlement;
import tw.temple.admin.print.PrintService.ApplicationForm;
import tw.temple.admin.print.PrintService.Card;
import tw.temple.admin.print.PrintService.Cards;
import tw.temple.admin.print.PrintService.FormHousehold;
import tw.temple.admin.print.PrintService.FormPerson;
import tw.temple.admin.print.PrintService.FormScope;
import tw.temple.admin.print.PrintService.NameList;
import tw.temple.admin.print.PrintService.PrintedCard;
import tw.temple.admin.print.PrintService.Wenshu;
import tw.temple.admin.print.PrintService.WenshuPerson;
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

        Cards cards = print.cardsByYear(year, null, LightCategory.BAGUA, false);
        assertThat(cards.lightTypeName()).isEqualTo("八卦轉運斗");
        assertThat(cards.cards()).anySatisfy(c -> {
            assertThat(c.name()).isEqualTo("王申報");
            assertThat(c.shortName()).isEqualTo("八卦轉運斗");
            assertThat(c.detail()).isEqualTo("補財庫");
        });
        assertThat(print.cardsByYear(year, guangming.getId(), null, false).cards()).anySatisfy(c -> {
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

        assertThat(print.cardsByYear(year, guangming.getId(), null, false).cards()).extracting(c -> c.name())
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

    @Test
    void unprintedCardsDropOutOnceMarkedAndComeBackWhenTheLampIsRelit() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household h = households.create(new HouseholdInput("台北市", "大同區", "延平北路1號", null, null, null,
            member("吳先印", "甲子", 1, false, 1, "子")), admin);
        households.addMember(h.getId(), member("吳後來", "乙丑", 2, false, 2, "丑"), admin);
        var views = households.detail(h.getId(), null).members();
        Long firstId = views.get(0).id();
        Long laterId = views.get(1).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        LightOrder order = orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(firstId, guangming.getId(), ItemAction.ADD, null, null),
                new ItemInput(laterId, guangming.getId(), ItemAction.ADD, null, null))), admin);
        Cards ofOrder = print.cardsByOrder(order.getId());
        assertThat(ofOrder.excludedCount()).isZero();
        Card first = ofOrder.cards().get(0);
        assertThat(first.name()).isEqualTo("吳先印");

        assertThat(print.markCardsPrinted(List.of(printed(first)))).isEqualTo(1);

        assertThat(unprintedNames(year, guangming.getId())).contains("吳後來").doesNotContain("吳先印");
        assertThat(print.cardsByYear(year, guangming.getId(), null, false).cards()).extracting(Card::name).contains("吳先印", "吳後來");
        Cards ofHousehold = print.cardsByHousehold(h.getId(), year);
        assertThat(ofHousehold.householdNumber()).isEqualTo(h.getHouseholdNumber());
        assertThat(ofHousehold.cards()).extracting(Card::name).containsExactly("吳先印", "吳後來");

        orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(firstId, guangming.getId(), ItemAction.REMOVE, null, null))), admin);
        assertThat(print.markCardsPrinted(List.of(printed(first)))).isZero();
        orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(firstId, guangming.getId(), ItemAction.ADD, null, null))), admin);
        assertThat(unprintedNames(year, guangming.getId())).contains("吳先印", "吳後來");
        assertThat(print.markCardsPrinted(List.of(printed(first)))).as("開著的舊頁面不能標掉重點後的新卡").isZero();
        assertThat(unprintedNames(year, guangming.getId())).contains("吳先印");
        Cards ofOriginal = print.cardsByOrder(order.getId());
        assertThat(ofOriginal.cards()).as("原單那盞燈已經被別張單重點").extracting(Card::name).containsExactly("吳後來");
        assertThat(ofOriginal.excludedCount()).isEqualTo(1);

        assertThatThrownBy(() -> print.markCardsPrinted(List.of())).hasMessageContaining("沒有要標記的卡片");
    }

    @Test
    void correctionOrderPrintsOnlyTheLampsItAddsAndTheyCanBeMarked() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household h = households.create(new HouseholdInput("台中市", "西區", "民權路2號", null, null, null,
            member("鄭換燈", "丙寅", 3, false, 3, "寅")), admin);
        Long headId = households.detail(h.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        var wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        LightOrder original = orders.createCounter(new CreateOrderRequest(year, h.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        LightOrder correction = orders.correctOrder(original.getId(), new CreateCorrectionRequest(null, null, null, "改點文昌燈",
            Settlement.CASH, List.of(new ItemInput(headId, guangming.getId(), ItemAction.REMOVE, null, null),
                new ItemInput(headId, wenchang.getId(), ItemAction.ADD, null, null))), admin);

        Cards cards = print.cardsByOrder(correction.getId());
        assertThat(cards.householdNumber()).isEqualTo(h.getHouseholdNumber());
        assertThat(cards.cards()).hasSize(1);
        Card added = cards.cards().get(0);
        assertThat(added.shortName()).isEqualTo(wenchang.getShortName());
        assertThat(cards.excludedCount()).isZero();
        Cards ofOriginal = print.cardsByOrder(original.getId());
        assertThat(ofOriginal.cards()).as("原單的光明燈已被更正單取消").isEmpty();
        assertThat(ofOriginal.excludedCount()).isEqualTo(1);

        assertThat(print.markCardsPrinted(List.of(printed(added)))).isEqualTo(1);
        assertThat(unprintedNames(year, wenchang.getId())).doesNotContain("鄭換燈");
    }

    @Test
    void orderCardsLeaveOutDeletedMembersAndDropTheHouseholdNumberAcrossHouseholds() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household mine = households.create(new HouseholdInput("台南市", "東區", "勝利路3號", null, null, null,
            member("許本戶", "丁卯", 4, false, 4, "卯")), admin);
        households.addMember(mine.getId(), member("許後刪", "戊辰", 5, false, 5, "辰"), admin);
        Household other = households.create(new HouseholdInput("台南市", "北區", "公園路4號", null, null, null,
            member("葉別戶", "己巳", 6, false, 6, "巳")), admin);
        var mineMembers = households.detail(mine.getId(), null).members();
        Long headId = mineMembers.get(0).id();
        Long laterId = mineMembers.get(1).id();
        Long otherId = households.detail(other.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        var wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        LightOrder original = orders.createCounter(new CreateOrderRequest(year, mine.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null),
                new ItemInput(laterId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        LightOrder crossHousehold = orders.correctOrder(original.getId(), new CreateCorrectionRequest(null, null, null, "補點文昌燈",
            Settlement.CASH, List.of(new ItemInput(headId, wenchang.getId(), ItemAction.ADD, null, null),
                new ItemInput(otherId, wenchang.getId(), ItemAction.ADD, null, null))), admin);
        Cards cross = print.cardsByOrder(crossHousehold.getId());
        assertThat(cross.cards()).extracting(Card::name).containsExactly("許本戶", "葉別戶");
        assertThat(cross.householdNumber()).as("卡片分屬兩戶，不能標成其中一戶").isNull();

        households.deleteMember(laterId, "過世", null, admin);
        Cards ofOriginal = print.cardsByOrder(original.getId());
        assertThat(ofOriginal.cards()).extracting(Card::name).containsExactly("許本戶");
        assertThat(ofOriginal.excludedCount()).isEqualTo(1);
        assertThat(ofOriginal.householdNumber()).isEqualTo(mine.getHouseholdNumber());
    }

    @Test
    void orderCardsAreHeadedWithTheHouseholdTheCardsActuallyBelongTo() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household a = households.create(new HouseholdInput("新竹市", "東區", "光復路5號", null, null, null,
            member("蔡甲戶", "庚午", 7, false, 7, "午")), admin);
        households.addMember(a.getId(), member("蔡搬走", "辛未", 8, false, 8, "未"), admin);
        Household b = households.create(new HouseholdInput("新竹市", "北區", "中正路6號", null, null, null,
            member("潘乙戶", "壬申", 9, false, 9, "申")), admin);
        var aMembers = households.detail(a.getId(), null).members();
        Long aHeadId = aMembers.get(0).id();
        Long moverId = aMembers.get(1).id();
        Long bHeadId = households.detail(b.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        var wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        LightOrder original = orders.createCounter(new CreateOrderRequest(year, a.getId(), null, null, null,
            List.of(new ItemInput(aHeadId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        LightOrder onlyOther = orders.correctOrder(original.getId(), new CreateCorrectionRequest(null, null, null, "幫乙戶補點",
            Settlement.CASH, List.of(new ItemInput(bHeadId, wenchang.getId(), ItemAction.ADD, null, null))), admin);
        Cards ofCorrection = print.cardsByOrder(onlyOther.getId());
        assertThat(ofCorrection.cards()).extracting(Card::name).containsExactly("潘乙戶");
        assertThat(ofCorrection.householdNumber()).as("更正單掛在甲戶，卡片全是乙戶的").isEqualTo(b.getHouseholdNumber());

        LightOrder moverOrder = orders.createCounter(new CreateOrderRequest(year, a.getId(), null, null, null,
            List.of(new ItemInput(moverId, guangming.getId(), ItemAction.ADD, null, null))), admin);
        households.moveMember(moverId, b.getId(), admin);
        Cards afterMove = print.cardsByOrder(moverOrder.getId());
        assertThat(afterMove.cards()).extracting(Card::name).containsExactly("蔡搬走");
        assertThat(afterMove.householdNumber()).as("成員搬到乙戶，當年的燈跟著搬").isEqualTo(b.getHouseholdNumber());

        orders.createCounter(new CreateOrderRequest(year, b.getId(), null, null, null,
            List.of(new ItemInput(moverId, guangming.getId(), ItemAction.REMOVE, null, null))), admin);
        Cards nothingLeft = print.cardsByOrder(moverOrder.getId());
        assertThat(nothingLeft.cards()).isEmpty();
        assertThat(nothingLeft.householdNumber()).as("沒有卡可印時用單據的戶").isEqualTo(a.getHouseholdNumber());
    }

    private static PrintedCard printed(Card card) {
        return new PrintedCard(card.recordId(), card.orderItemId());
    }

    private List<String> unprintedNames(int year, Long lightTypeId) {
        return print.cardsByYear(year, lightTypeId, null, true).cards().stream().map(Card::name).toList();
    }

    @Test
    void wenshuPrintsEveryActiveMemberOfAHouseholdWithTheHeadFirst() {
        User admin = users.findByUsername("admin").orElseThrow();
        Household h = households.create(new HouseholdInput("雲林縣", "元長鄉", "內寮村好收路5-6號", null, null, null,
            member("林戶長", "壬辰", 12, false, 9, "子")), admin);
        households.addMember(h.getId(), new MemberInput("林女兒", "F", "臺北市", "大安區", "復興南路一段1號", null, "乙亥", 6, true, 30,
            null, null), admin);
        households.addMember(h.getId(), member("林已刪", null, null, false, null, null), admin);
        var views = households.detail(h.getId(), null).members();
        Long daughterId = views.stream().filter(m -> m.name().equals("林女兒")).findFirst().orElseThrow().id();
        Long goneId = views.stream().filter(m -> m.name().equals("林已刪")).findFirst().orElseThrow().id();
        households.deleteMember(goneId, "重複建檔", null, admin);
        households.updateMember(daughterId, new MemberInput("林女兒", "F", "臺北市", "大安區", "復興南路一段1號", null, "乙亥", 6, true, 30,
            null, 0), admin);

        String lanternYear = config.get(ConfigService.CURRENT_YEAR);
        config.update(ConfigService.CURRENT_YEAR, "2026", admin);
        Wenshu all;
        try {
            all = print.wenshu(h.getId(), null);
        } finally {
            config.update(ConfigService.CURRENT_YEAR, lanternYear, admin);
        }
        assertThat(all.householdNumber()).isEqualTo(h.getHouseholdNumber());
        assertThat(all.year()).isEqualTo(2026);
        assertThat(all.ganzhiYear()).isEqualTo("丙午");
        assertThat(all.prayerMonth()).isEqualTo(config.get(ConfigService.PRAYER_MONTH));
        assertThat(all.templeName()).isEqualTo(config.get(ConfigService.TEMPLE_NAME));
        assertThat(all.templeAddress()).isEqualTo(config.get(ConfigService.TEMPLE_ADDRESS));
        assertThat(all.people()).extracting(WenshuPerson::name).containsExactly("林戶長", "林女兒");
        WenshuPerson head = all.people().get(0);
        assertThat(head.cityDistrict()).isEqualTo("雲林縣元長鄉");
        assertThat(head.address()).isEqualTo("內寮村好收路5-6號");
        assertThat(head.ganzhi()).isEqualTo("壬辰");
        assertThat(head.month()).isEqualTo((short) 12);
        assertThat(head.day()).isEqualTo((short) 9);
        assertThat(head.hour()).isEqualTo("子");

        assertThat(all.people()).extracting(WenshuPerson::householdNumber).containsOnly(h.getHouseholdNumber());

        Wenshu one = print.wenshu(null, daughterId);
        assertThat(one.people()).singleElement().satisfies(p -> {
            assertThat(p.memberId()).isEqualTo(daughterId);
            assertThat(p.gender()).isEqualTo("F");
            assertThat(p.cityDistrict()).isEqualTo("臺北市大安區");
            assertThat(p.leap()).isTrue();
            assertThat(p.hour()).isNull();
        });
        assertThatThrownBy(() -> print.wenshu(null, goneId)).isInstanceOf(ApiException.class).hasMessageContaining("已刪除");
        assertThatThrownBy(() -> print.wenshu(null, null)).isInstanceOf(ApiException.class);
    }

    @Test
    void wenshuByScopePrintsWholeHouseholdsChosenByTheYearsLights() {
        User admin = users.findByUsername("admin").orElseThrow();
        int year = config.currentYear();
        Household bagua = households.create(new HouseholdInput(null, null, null, null, null, null,
            member("郭安斗", "甲子", 1, false, 1, "子")), admin);
        households.addMember(bagua.getId(), member("郭沒安", null, null, false, null, null), admin);
        Household lit = households.create(new HouseholdInput(null, null, null, null, null, null,
            member("黃光明", null, null, false, null, null)), admin);
        Household dark = households.create(new HouseholdInput(null, null, null, null, null, null,
            member("許沒點", null, null, false, null, null)), admin);
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        var caiku = lightTypes.findByName("補財庫").orElseThrow();
        Long baguaHeadId = households.detail(bagua.getId(), null).members().get(0).id();
        Long litHeadId = households.detail(lit.getId(), null).members().get(0).id();
        orders.createCounter(new CreateOrderRequest(year, bagua.getId(), null, null, null,
            List.of(new ItemInput(baguaHeadId, caiku.getId(), ItemAction.ADD, null, null))), admin);
        orders.createCounter(new CreateOrderRequest(year, lit.getId(), null, null, null,
            List.of(new ItemInput(litHeadId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        Wenshu baguaOnly = print.wenshuByScope(FormScope.BAGUA, year);
        assertThat(baguaOnly.householdNumber()).isNull();
        assertThat(baguaOnly.year()).isEqualTo(year);
        assertThat(baguaOnly.ganzhiYear()).isEqualTo(Ganzhi.ofYear(year));
        assertThat(namesOf(baguaOnly)).as("安斗的戶整戶都印，沒安斗的成員也印").containsSubsequence("郭安斗", "郭沒安")
            .doesNotContain("黃光明", "許沒點");
        assertThat(baguaOnly.people()).filteredOn(p -> p.name().equals("郭沒安")).singleElement()
            .satisfies(p -> assertThat(p.householdNumber()).isEqualTo(bagua.getHouseholdNumber()));

        assertThat(namesOf(print.wenshuByScope(FormScope.LIT, year))).contains("郭安斗", "郭沒安", "黃光明").doesNotContain("許沒點");
        assertThat(namesOf(print.wenshuByScope(FormScope.ALL, year))).contains("郭安斗", "郭沒安", "黃光明", "許沒點");
        assertThat(namesOf(print.wenshuByScope(FormScope.BAGUA, year - 5))).doesNotContain("郭安斗", "郭沒安");
    }

    private static List<String> namesOf(Wenshu wenshu) {
        return wenshu.people().stream().map(WenshuPerson::name).toList();
    }
}
