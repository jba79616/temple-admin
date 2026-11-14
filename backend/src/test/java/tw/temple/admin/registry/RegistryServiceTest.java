package tw.temple.admin.registry;

import static org.assertj.core.api.Assertions.assertThat;

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
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.ItemAction;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.ItemInput;
import tw.temple.admin.order.OrderService;
import tw.temple.admin.registry.RegistryDtos.HouseholdRow;
import tw.temple.admin.registry.RegistryDtos.MemberRow;
import tw.temple.admin.registry.RegistryDtos.PageView;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RegistryServiceTest {

    @Autowired RegistryService registry;
    @Autowired HouseholdService households;
    @Autowired OrderService orders;
    @Autowired LightTypeRepository lightTypes;
    @Autowired UserRepository users;

    private static MemberInput member(String name) {
        return new MemberInput(name, "M", null, null, null, null, "甲戌", 9, false, 9, null, null);
    }

    @Test
    void listsMembersAndHouseholdsWithThisYearsLanterns() {
        User admin = users.findByUsername("admin").orElseThrow();
        Household lit = households.create(new HouseholdInput("新北市", "三重區", "重新路1號", "02-1111-2222", null, null, member("王有燈")), admin);
        Household dark = households.create(new HouseholdInput(null, null, null, null, null, null, member("李沒燈")), admin);
        Long headId = households.detail(lit.getId(), null).members().get(0).id();
        var guangming = lightTypes.findByName("光明燈").orElseThrow();
        orders.createCounter(new CreateOrderRequest(null, lit.getId(), null, null, null,
            List.of(new ItemInput(headId, guangming.getId(), ItemAction.ADD, null, null))), admin);

        PageView<MemberRow> all = registry.members(0, 200, false, null);
        assertThat(all.items()).extracting(MemberRow::name).contains("王有燈", "李沒燈");
        assertThat(all.items()).isSortedAccordingTo((a, b) -> a.id().compareTo(b.id()));
        MemberRow row = all.items().stream().filter(r -> r.id().equals(headId)).findFirst().orElseThrow();
        assertThat(row.lanterns()).containsExactly("光明");
        assertThat(row.cityDistrict()).isEqualTo("新北市三重區");
        assertThat(row.address()).isEqualTo("重新路1號");
        assertThat(row.phone()).isEqualTo("02-1111-2222");
        assertThat(row.birthText()).isEqualTo("甲戌年 9月 9日 吉時 生");
        assertThat(row.zodiac()).isEqualTo("狗");

        PageView<MemberRow> litOnly = registry.members(0, 200, true, null);
        assertThat(litOnly.items()).extracting(MemberRow::name).contains("王有燈").doesNotContain("李沒燈");

        PageView<HouseholdRow> allHouseholds = registry.households(0, 200, false, null);
        assertThat(allHouseholds.items()).extracting(HouseholdRow::id).contains(lit.getId(), dark.getId());
        PageView<HouseholdRow> litHouseholds = registry.households(0, 200, true, null);
        assertThat(litHouseholds.items()).extracting(HouseholdRow::id).contains(lit.getId()).doesNotContain(dark.getId());
        HouseholdRow hr = litHouseholds.items().stream().filter(r -> r.id().equals(lit.getId())).findFirst().orElseThrow();
        assertThat(hr.headName()).isEqualTo("王有燈");
        assertThat(hr.memberCount()).isEqualTo(1);
        assertThat(hr.lanternCount()).isEqualTo(1);
        assertThat(hr.members()).extracting(MemberRow::name).containsExactly("王有燈");
        assertThat(hr.members().get(0).lanterns()).containsExactly("光明");

        PageView<MemberRow> small = registry.members(0, 1, false, null);
        assertThat(small.items()).hasSize(1);
        assertThat(small.size()).isEqualTo(1);
        assertThat(small.totalPages()).isGreaterThanOrEqualTo(2);
    }
}
