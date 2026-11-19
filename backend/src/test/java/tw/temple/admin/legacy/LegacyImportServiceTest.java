package tw.temple.admin.legacy;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdFields;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.household.TaiwanAddress;
import tw.temple.admin.legacy.LegacyImportService.Issue;
import tw.temple.admin.legacy.LegacyImportService.IssueKind;
import tw.temple.admin.legacy.LegacyImportService.Report;
import tw.temple.admin.light.LightType;
import tw.temple.admin.light.LightTypeRepository;
import tw.temple.admin.order.AnnualLightRecordRepository;
import tw.temple.admin.order.LightOrderRepository;
import tw.temple.admin.order.OrderKind;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LegacyImportServiceTest {

    private static final String DUMP = """
        -- MySQL dump 10.13
        DROP TABLE IF EXISTS `lamp`;
        CREATE TABLE `lamp` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `name` varchar(255) DEFAULT NULL,
          `price` decimal(10,2) DEFAULT NULL,
          PRIMARY KEY (`id`) USING BTREE
        ) ENGINE=InnoDB;
        INSERT INTO `lamp` VALUES (1,'光明燈',300.00),(2,'文昌燈',350.00),(3,'太歲燈',300.00),(4,'八卦轉運斗',500.00);
        INSERT INTO `people` (`id`, `ishouseholdhead`, `household_number`, `people_order`, `username`, `sex`, `lunar_year`, `lunar_month`, `lunar_day`, `lunar_hour`, `leap_month`, `address`, `householdhead`, `phone`, `remark`, `update_time`, `guangming112`, `bagua112`, `guangming113`, `wenchang113`, `is_deleted`) VALUES (1,1,9001,1,'張利在','男','壬午','6','21','吉',0,'雲林縣元長鄉新吉村7鄰新庄46號','張利在',NULL,NULL,NULL,1,NULL,_binary '\u0001',NULL,0),(2,0,9001,2,'張登賀','男','甲寅','4','17','子',0,'台北市大安區和平東路1號','張利在','0912345678',NULL,NULL,1,1,_binary '\\0',_binary '\u0001',0),(3,0,9001,3,'張已刪','女','丙戌','8','16','吉',0,'雲林縣元長鄉新吉村7鄰新庄46號','張利在',NULL,NULL,'2024-02-09 17:45:58',1,NULL,_binary '\u0001',NULL,1);
        INSERT INTO `people` (`id`, `ishouseholdhead`, `household_number`, `people_order`, `username`, `sex`, `lunar_year`, `lunar_month`, `lunar_day`, `lunar_hour`, `leap_month`, `address`, `householdhead`, `phone`, `remark`, `update_time`, `guangming112`, `bagua112`, `guangming113`, `wenchang113`, `is_deleted`) VALUES (4,0,9002,1,'陳　鶴','女','辛已','吉','0','0',1,'桃園縣中壢市龍岡路2段73巷3號5樓','陳大','',NULL,NULL,NULL,NULL,_binary '\u0001',NULL,0),(5,0,9002,1,'李?明','男','乙丑','3','5','午',0,'嘉義市民族路100號','陳大',NULL,'備註一',NULL,NULL,NULL,NULL,0x01,0);
        """;

    @Autowired LegacyImportService service;
    @Autowired HouseholdRepository households;
    @Autowired MemberRepository members;
    @Autowired LightTypeRepository lightTypes;
    @Autowired LightOrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired AnnualLightRecordRepository records;
    @Autowired UserRepository users;
    @Autowired HouseholdService householdService;

    private User admin() {
        return users.findByUsername("admin").orElseThrow();
    }

    @Test
    @Order(1)
    void previewWritesNothingButReportsEverything() {
        Report report = service.run(DUMP, admin(), false);

        assertThat(report.committed()).isFalse();
        assertThat(report.counts().people()).isEqualTo(5);
        assertThat(report.counts().deleted()).isEqualTo(1);
        assertThat(report.counts().households()).isEqualTo(2);
        assertThat(report.counts().householdsCreated()).isEqualTo(2);
        assertThat(report.counts().membersCreated()).isEqualTo(5);
        assertThat(report.counts().orders()).isEqualTo(3);
        assertThat(report.counts().items()).isEqualTo(9);
        assertThat(report.counts().deletedItems()).isEqualTo(2);
        assertThat(report.counts().payments()).isEqualTo(3);
        assertThat(report.years()).extracting("year", "guangming", "wenchang", "taisui", "bagua")
            .containsExactly(org.assertj.core.groups.Tuple.tuple(2023, 3, 0, 0, 1), org.assertj.core.groups.Tuple.tuple(2024, 3, 2, 0, 0));
        assertThat(households.findByLegacyIdIsNotNull()).isEmpty();
        assertThat(members.findByLegacyIdIsNotNull()).isEmpty();

        List<String> details = report.issues().stream().map(Issue::detail).toList();
        assertThat(report.issues()).extracting(Issue::kind)
            .contains(IssueKind.HEAD, IssueKind.BIRTH, IssueKind.PERSON, IssueKind.ORDER, IssueKind.DISTRICT)
            .doesNotContain(IssueKind.ADDRESS);
        assertThat(details).anyMatch(d -> d.contains("沒有標戶長"));
        assertThat(details).anyMatch(d -> d.contains("戶長名「陳大」不在成員裡"));
        assertThat(details).anyMatch(d -> d.contains("干支年「辛已」"));
        assertThat(details).anyMatch(d -> d.contains("日「0」"));
        assertThat(details).anyMatch(d -> d.contains("時辰「0」"));
        assertThat(details).anyMatch(d -> d.contains("標了閏月但沒有月份"));
        assertThat(details).anyMatch(d -> d.contains("順序有重複"));
        assertThat(details).anyMatch(d -> d.contains("嘉義市民族路100號"));
        assertThat(report.issues()).filteredOn(i -> i.kind() == IssueKind.PERSON).extracting(Issue::name).containsExactly("李?明");
    }

    @Test
    @Order(2)
    void commitBuildsHouseholdsMembersOrdersAndRecords() {
        Report report = service.run(DUMP, admin(), true);
        assertThat(report.committed()).isTrue();

        Household h1 = households.findByLegacyIdIsNotNull().stream().filter(h -> h.getLegacyId() == 9001).findFirst().orElseThrow();
        assertThat(h1.getHouseholdNumber()).isEqualTo(9001);
        assertThat(h1.getCity()).isEqualTo("雲林縣");
        assertThat(h1.getDistrict()).isEqualTo("元長鄉");
        assertThat(h1.getAddress()).isEqualTo("新吉村7鄰新庄46號");
        List<Member> m1 = members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(h1.getId());
        assertThat(m1).extracting(Member::getName).containsExactly("張利在", "張登賀");
        assertThat(m1.get(0).isHead()).isTrue();
        assertThat(m1.get(0).getLegacyId()).isEqualTo(1);
        Member dengHe = m1.get(1);
        assertThat(dengHe.getCity()).isEqualTo("臺北市");
        assertThat(dengHe.getDistrict()).isEqualTo("大安區");
        assertThat(dengHe.getAddress()).isEqualTo("和平東路1號");
        assertThat(dengHe.getPhone()).isEqualTo("0912345678");
        assertThat(dengHe.getBirthHourBranch()).isEqualTo("子");
        Member gone = members.findByLegacyIdIsNotNull().stream().filter(m -> m.getLegacyId() == 3).findFirst().orElseThrow();
        assertThat(gone.getName()).isEqualTo("張已刪");
        assertThat(gone.getHousehold().getId()).isEqualTo(h1.getId());
        assertThat(gone.isDeleted()).isTrue();
        assertThat(gone.isHead()).isFalse();
        assertThat(gone.getDeleteReason()).isEqualTo("舊系統已刪除");
        assertThat(gone.getDeletedAt().atZoneSameInstant(java.time.ZoneId.of("Asia/Taipei")).toLocalDateTime())
            .isEqualTo(java.time.LocalDateTime.of(2024, 2, 9, 17, 45, 58));
        assertThat(gone.getSortOrder()).isEqualTo((short) 3);
        assertThat(records.findByMemberIdAndYearAndActiveTrue(gone.getId(), 2023)).hasSize(1);
        assertThat(records.findByMemberIdAndYearAndActiveTrue(gone.getId(), 2024)).hasSize(1);

        Household h2 = households.findByLegacyIdIsNotNull().stream().filter(h -> h.getLegacyId() == 9002).findFirst().orElseThrow();
        assertThat(h2.getCity()).isEqualTo("桃園市");
        assertThat(h2.getDistrict()).isEqualTo("中壢區");
        assertThat(h2.getAddress()).isEqualTo("龍岡路2段73巷3號5樓");
        assertThat(h2.getNotes()).isEqualTo("李?明：備註一");
        List<Member> m2 = members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(h2.getId());
        assertThat(m2).extracting(Member::getName).containsExactly("陳鶴", "李?明");
        assertThat(m2.get(0).isHead()).isTrue();
        assertThat(m2.get(0).getBirthGanzhi()).isNull();
        assertThat(m2.get(0).getBirthMonth()).isNull();
        assertThat(m2.get(0).isBirthMonthIsLeap()).isFalse();
        assertThat(m2.get(0).getBirthDay()).isNull();
        assertThat(m2.get(0).getBirthHourBranch()).isNull();
        assertThat(m2.get(1).getCity()).isEqualTo("嘉義市");
        assertThat(m2.get(1).getDistrict()).isNull();
        assertThat(m2.get(1).getAddress()).isEqualTo("民族路100號");
        assertThat(m2.get(1).getSortOrder()).isEqualTo((short) 2);

        LightType bagua = lightTypes.findByLegacyCode("bagua").orElseThrow();
        LightType wenchang = lightTypes.findByName("文昌燈").orElseThrow();
        var baguaRecord = records.findByMemberIdAndLightTypeIdAndYear(dengHe.getId(), bagua.getId(), 2023).orElseThrow();
        assertThat(baguaRecord.isActive()).isTrue();
        assertThat(baguaRecord.getUnitPrice()).isEqualTo(500);
        var wenchangRecord = records.findByMemberIdAndLightTypeIdAndYear(dengHe.getId(), wenchang.getId(), 2024).orElseThrow();
        assertThat(wenchangRecord.getUnitPrice()).isEqualTo(350);
        assertThat(records.findByMemberIdAndYearAndActiveTrue(dengHe.getId(), 2023)).hasSize(2);

        var h1Orders = orders.findByHouseholdIdOrderByIdDesc(h1.getId());
        assertThat(h1Orders).hasSize(2).allMatch(o -> o.getKind() == OrderKind.IMPORT);
        var order2023 = h1Orders.stream().filter(o -> o.getYear() == 2023).findFirst().orElseThrow();
        assertThat(order2023.getTotalDue()).isEqualTo(1400);
        assertThat(order2023.getRegisteredOn()).hasYear(2023);
        var paid = payments.findByOrderIdOrderByIdAsc(order2023.getId());
        assertThat(paid).hasSize(1);
        assertThat(paid.get(0).getKind()).isEqualTo(PaymentKind.IMPORT);
        assertThat(paid.get(0).getAmount()).isEqualTo(1400);

        Household fresh = householdService.create(new HouseholdInput(null, null, null, null, null, null,
            new MemberInput("後來新增", null, null, null, null, null, null, null, false, null, null, null)), admin());
        assertThat(fresh.getHouseholdNumber()).isGreaterThan(9002);
    }

    @Test
    @Order(3)
    void rerunUpdatesInPlaceWithoutDuplicating() {
        Household h1 = households.findByLegacyIdIsNotNull().stream().filter(h -> h.getLegacyId() == 9001).findFirst().orElseThrow();
        h1.update(new HouseholdFields(h1.getCity(), h1.getDistrict(), h1.getAddress(), h1.getPhone(), "請找兒子", h1.getNotes()));
        households.saveAndFlush(h1);
        Member dengHe = members.findByLegacyIdIsNotNull().stream().filter(m -> m.getLegacyId() == 2).findFirst().orElseThrow();
        householdService.setHead(dengHe.getId(), admin());

        Report report = service.run(DUMP, admin(), true);

        assertThat(report.counts().householdsCreated()).isZero();
        assertThat(report.counts().householdsUpdated()).isEqualTo(2);
        assertThat(report.counts().membersCreated()).isZero();
        assertThat(report.counts().membersUpdated()).isEqualTo(5);
        assertThat(report.counts().orders()).isZero();
        assertThat(report.counts().items()).isZero();
        assertThat(report.counts().recordsExisting()).isEqualTo(9);
        assertThat(members.findByLegacyIdIsNotNull()).hasSize(5);
        assertThat(households.findById(h1.getId()).orElseThrow().getContactNote()).isEqualTo("請找兒子");
        assertThat(members.findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(h1.getId()))
            .filteredOn(Member::isHead).extracting(Member::getName).containsExactly("張登賀");
    }

    @Test
    void splitsAddressesWithOldCountyNames() {
        assertThat(TaiwanAddress.split("桃園縣龜山鄉楓樹村楓樹一街70巷28號"))
            .extracting("city", "district", "street").containsExactly("桃園市", "龜山區", "楓樹村楓樹一街70巷28號");
        assertThat(TaiwanAddress.split("苗栗縣頭份鎮中正路1號")).extracting("city", "district", "street").containsExactly("苗栗縣", "頭份市", "中正路1號");
        assertThat(TaiwanAddress.split("台中市北屯區文心路4段1號")).extracting("city", "district", "street").containsExactly("臺中市", "北屯區", "文心路4段1號");
        assertThat(TaiwanAddress.split("632 雲林縣虎尾鎮中正路1號")).extracting("city", "district", "street").containsExactly("雲林縣", "虎尾鎮", "中正路1號");
        assertThat(TaiwanAddress.split("嘉義市民族路100號")).extracting("city", "district", "street").containsExactly("嘉義市", null, "民族路100號");
        assertThat(TaiwanAddress.split("上海市浦東新區勝利路188號")).extracting("city", "district", "street").containsExactly(null, null, "上海市浦東新區勝利路188號");
        assertThat(TaiwanAddress.split(null).raw()).isNull();
    }
}
