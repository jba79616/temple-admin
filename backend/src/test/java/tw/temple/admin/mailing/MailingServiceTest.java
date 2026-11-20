package tw.temple.admin.mailing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.mailing.MailingDtos.MailingInput;
import tw.temple.admin.mailing.MailingDtos.MailingView;
import tw.temple.admin.mailing.MailingImportService.Issue;
import tw.temple.admin.mailing.MailingImportService.IssueKind;
import tw.temple.admin.mailing.MailingImportService.Report;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class MailingServiceTest {

    @Autowired MailingService mailing;
    @Autowired MailingImportService importer;
    @Autowired HouseholdService households;
    @Autowired UserRepository users;

    private User admin() {
        return users.findByUsername("admin").orElseThrow();
    }

    private Household household(String city, String district, String street, String head) {
        return households.create(new HouseholdInput(city, district, street, null, null, null,
            new MemberInput(head, "M", null, null, null, null, null, null, false, null, null, null)), admin());
    }

    private MailingView find(Long id) {
        return mailing.list(null).stream().filter(v -> v.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void linkedRowPrintsTheHeadAndHouseholdAddressUnlessARecipientIsGiven() {
        Household h = household("新北市", "三重區", "重新路1號", "王戶長");

        MailingRecipient linked = mailing.create(new MailingInput(h.getHouseholdNumber(), null, null, null, null, null, null), admin());
        MailingView view = find(linked.getId());
        assertThat(view.householdNumber()).isEqualTo(h.getHouseholdNumber());
        assertThat(view.headName()).isEqualTo("王戶長");
        assertThat(view.name()).isEqualTo("王戶長");
        assertThat(view.city()).isEqualTo("新北市");
        assertThat(view.district()).isEqualTo("三重區");
        assertThat(view.address()).isEqualTo("新北市三重區重新路1號");
        assertThat(view.active()).isTrue();

        mailing.update(linked.getId(), new MailingInput(h.getHouseholdNumber(), "王太太", "241", null, "名單上是太太", true, null), admin());
        MailingView overridden = find(linked.getId());
        assertThat(overridden.name()).isEqualTo("王太太");
        assertThat(overridden.headName()).isEqualTo("王戶長");
        assertThat(overridden.zip()).isEqualTo("241");
        assertThat(mailing.list(h.getId())).extracting(MailingView::id).containsExactly(linked.getId());
    }

    @Test
    void oneRowPerHousehold() {
        Household h = household(null, null, null, "李單列");
        mailing.create(new MailingInput(h.getHouseholdNumber(), null, null, null, null, null, null), admin());

        assertThatThrownBy(() -> mailing.create(new MailingInput(h.getHouseholdNumber(), null, null, null, null, null, null), admin()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("已在帖子名單");
        assertThatThrownBy(() -> mailing.create(new MailingInput(999_999, null, null, null, null, null, null), admin()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("找不到戶");
    }

    @Test
    void standaloneRowNeedsNameAndAddressAndCanBeLinkedLater() {
        assertThatThrownBy(() -> mailing.create(new MailingInput(null, "張無址", "241", null, null, null, null), admin()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("姓名與地址");
        assertThatThrownBy(() -> mailing.create(new MailingInput(null, "張怪郵遞", "24", "新北市三重區重新路2號", null, null, null), admin()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("郵遞區號");

        MailingRecipient standalone = mailing.create(new MailingInput(null, "張獨立", null, "台北市大安區和平東路1號", null, null, null), admin());
        MailingView view = find(standalone.getId());
        assertThat(view.householdNumber()).isNull();
        assertThat(view.name()).isEqualTo("張獨立");
        assertThat(view.city()).isEqualTo("臺北市");
        assertThat(view.district()).isEqualTo("大安區");
        assertThat(view.address()).isEqualTo("臺北市大安區和平東路1號");

        Household h = household("臺北市", "大安區", "和平東路1號", "張獨立");
        mailing.update(standalone.getId(), new MailingInput(h.getHouseholdNumber(), null, null, null, "後來登記了", true, null), admin());
        MailingView linked = find(standalone.getId());
        assertThat(linked.householdNumber()).isEqualTo(h.getHouseholdNumber());
        assertThat(linked.name()).isEqualTo("張獨立");
        assertThat(linked.note()).isEqualTo("後來登記了");

        mailing.delete(standalone.getId(), admin());
        assertThat(mailing.list(h.getId())).isEmpty();
        assertThatThrownBy(() -> mailing.view(standalone.getId())).isInstanceOf(ApiException.class);
    }

    @Test
    void overseasAddressesAreFlaggedButKept() {
        MailingRecipient abroad = mailing.create(new MailingInput(null, "陳海外", null, "上海市復興中路1340弄1號1102室", null, null, null), admin());
        assertThat(find(abroad.getId()).overseas()).isTrue();
        assertThat(find(abroad.getId()).active()).isTrue();

        Household h = household(null, null, "廣東省深圳市南山區前海路3001號", "林深圳");
        MailingRecipient linked = mailing.create(new MailingInput(h.getHouseholdNumber(), null, null, null, null, null, null), admin());
        assertThat(find(linked.getId()).overseas()).isTrue();
        assertThat(find(linked.getId()).address()).isEqualTo("廣東省深圳市南山區前海路3001號");

        mailing.update(abroad.getId(), new MailingInput(null, "陳海外", null, "臺中市大里區中興路二段816巷7號", "搬回來了", true, null), admin());
        assertThat(find(abroad.getId()).overseas()).isFalse();

        mailing.delete(abroad.getId(), admin());
        mailing.delete(linked.getId(), admin());
    }

    @Test
    void importPreviewWritesNothingAndCommitLinksByHouseholdNumber() {
        Household h = household("桃園市", "中壢區", "中央路3號", "陳匯入");
        String csv = "﻿姓名,郵遞區號,住址,戶號,收件人,備註,來源\r\n"
            + "陳匯入,320,桃園市中壢區中央路3號," + h.getHouseholdNumber() + ",,名單第1列,安斗名單 1\r\n"
            + "陳重複,320,桃園市中壢區中央路3號," + h.getHouseholdNumber() + ",,,安斗名單 2\r\n"
            + "\"林, 獨立\",\"33\",\"桃園市中壢區環北路5號\",,,,安斗名單 3\r\n"
            + "林獨立,320,桃園市中壢區環北路5號,,,,安斗名單 4\r\n"
            + "林獨立,,桃園市中壢區環北路5號,,,,安斗名單 5\r\n"
            + "缺地址,,,,,,安斗名單 6\r\n"
            + "沒這戶,,,999999,,,安斗名單 7\r\n"
            + "備註太長,,桃園市中壢區環北路7號,,," + "長".repeat(201) + ",安斗名單 8\r\n"
            + ",,,,,,\r\n";

        Report preview = importer.run(csv, admin(), false);
        assertThat(preview.committed()).isFalse();
        assertThat(preview.rows()).isEqualTo(8);
        assertThat(preview.linked()).isEqualTo(1);
        assertThat(preview.standalone()).isEqualTo(2);
        assertThat(preview.skipped()).isEqualTo(5);
        assertThat(preview.issues()).extracting(Issue::kind)
            .containsExactlyInAnyOrder(IssueKind.DUPLICATE, IssueKind.ZIP, IssueKind.DUPLICATE, IssueKind.REQUIRED, IssueKind.HOUSEHOLD,
                IssueKind.TOO_LONG);
        assertThat(mailing.list(h.getId())).isEmpty();

        Report committed = importer.run(csv, admin(), true);
        assertThat(committed.committed()).isTrue();
        assertThat(committed.linked()).isEqualTo(1);
        List<MailingView> all = mailing.list(null);
        MailingView linked = all.stream().filter(v -> h.getId().equals(v.householdId())).findFirst().orElseThrow();
        assertThat(linked.name()).isEqualTo("陳匯入");
        assertThat(linked.zip()).isEqualTo("320");
        assertThat(linked.source()).isEqualTo("安斗名單 1");
        assertThat(linked.note()).isEqualTo("名單第1列");
        assertThat(all).filteredOn(v -> "林, 獨立".equals(v.name())).singleElement()
            .satisfies(v -> {
                assertThat(v.zip()).isNull();
                assertThat(v.address()).isEqualTo("桃園市中壢區環北路5號");
                assertThat(v.city()).isEqualTo("桃園市");
            });
        assertThat(all).filteredOn(v -> "林獨立".equals(v.name())).hasSize(1);

        Report again = importer.run(csv, admin(), true);
        assertThat(again.linked()).isZero();
        assertThat(again.standalone()).isZero();
        assertThat(again.issues()).filteredOn(i -> i.kind() == IssueKind.DUPLICATE).hasSize(5);
    }

    @Test
    void pausingKeepsTheOtherFieldsAndStaleEditsAreRejected() {
        Household h = household("新北市", "三重區", "重新路9號", "王版本");
        MailingRecipient r = mailing.create(new MailingInput(h.getHouseholdNumber(), "王太太", null, null, "備註", true, null), admin());
        int readVersion = find(r.getId()).version();

        mailing.setActive(r.getId(), false, admin());
        MailingView paused = find(r.getId());
        assertThat(paused.active()).isFalse();
        assertThat(paused.recipientName()).isEqualTo("王太太");
        assertThat(paused.note()).isEqualTo("備註");
        assertThat(paused.version()).isGreaterThan(readVersion);

        assertThatThrownBy(() -> mailing.update(r.getId(),
            new MailingInput(h.getHouseholdNumber(), "王先生", null, null, null, true, readVersion), admin()))
            .isInstanceOf(ApiException.class).hasMessageContaining("別人改過");
        assertThat(find(r.getId()).recipientName()).isEqualTo("王太太");
        mailing.delete(r.getId(), admin());
    }

    @Test
    void manualAddressesAreStoredNormalizedSoImportDeduplicatesAgainstThem() {
        MailingRecipient manual = mailing.create(new MailingInput(null, "王比對", null, "106 台北市 大安區 和平東路1號", null, null, null), admin());
        assertThat(find(manual.getId()).address()).isEqualTo("臺北市大安區和平東路1號");

        Report report = importer.run("姓名,地址\r\n王比對,臺北市大安區和平東路1號\r\n", admin(), false);
        assertThat(report.rows()).isEqualTo(1);
        assertThat(report.standalone()).isZero();
        assertThat(report.issues()).extracting(Issue::kind).containsExactly(IssueKind.DUPLICATE);
        mailing.delete(manual.getId(), admin());
    }
}
