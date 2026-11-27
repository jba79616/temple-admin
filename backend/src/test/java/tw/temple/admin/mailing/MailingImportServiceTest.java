package tw.temple.admin.mailing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tw.temple.admin.TestcontainersConfiguration;
import tw.temple.admin.audit.AuditLog;
import tw.temple.admin.audit.AuditLogRepository;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.HouseholdInput;
import tw.temple.admin.household.HouseholdDtos.MemberInput;
import tw.temple.admin.household.HouseholdService;
import tw.temple.admin.mailing.MailingImportService.Issue;
import tw.temple.admin.mailing.MailingImportService.IssueKind;
import tw.temple.admin.mailing.MailingImportService.Report;
import tw.temple.admin.user.User;
import tw.temple.admin.user.UserRepository;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class MailingImportServiceTest {

    @Autowired MailingImportService importer;
    @Autowired MailingService mailing;
    @Autowired MailingRecipientRepository recipients;
    @Autowired HouseholdService households;
    @Autowired AuditLogRepository auditLogs;
    @Autowired UserRepository users;

    private User admin() {
        return users.findByUsername("admin").orElseThrow();
    }

    private Household household(String head) {
        return households.create(new HouseholdInput("臺中市", "北區", "三民路1號", null, null, null,
            new MemberInput(head, "M", null, null, null, null, null, null, false, null, null, null)), admin());
    }

    @Test
    void emptyFileAndMissingHeaderAreRejected() {
        assertThatThrownBy(() -> importer.run("", admin(), false)).hasMessage("檔案是空的");
        assertThatThrownBy(() -> importer.run("地址,備註\r\n臺中市北區三民路1號,x\r\n", admin(), false))
            .hasMessage("第一列要有欄名，至少要有「姓名」或「戶號」");
    }

    @Test
    void everyIssueCarriesItsLineNameAndDetail() {
        Household h = household("吳行號");
        String longName = "名".repeat(51);
        String csv = "戶號,姓名,郵遞,住址,收件人,備註,來源\n"
            + "abc,吳甲,,,,,\n"
            + "999998,吳乙,,,,,\n"
            + ",吳丙,,,,,\n"
            + "\n"
            + h.getHouseholdNumber() + ",吳丁,,," + longName + ",,\n"
            + ",吳戊,,臺中市北區" + "路".repeat(200) + ",,,\n"
            + ",吳己,,臺中市北區三民路2號,,,來" + "源".repeat(50) + "\n"
            + h.getHouseholdNumber() + ",吳庚,12,,,,\n"
            + h.getHouseholdNumber() + ",吳辛,,,,,\n";

        Report report = importer.run(csv, admin(), false);

        assertThat(report.committed()).isFalse();
        assertThat(report.rows()).isEqualTo(8);
        assertThat(report.linked()).isEqualTo(1);
        assertThat(report.standalone()).isZero();
        assertThat(report.skipped()).isEqualTo(7);
        assertThat(report.issues()).containsExactly(
            new Issue(2, IssueKind.HOUSEHOLD, "吳甲", "戶號「abc」不是數字"),
            new Issue(3, IssueKind.HOUSEHOLD, "吳乙", "找不到戶 999998"),
            new Issue(4, IssueKind.REQUIRED, "吳丙", "沒有戶號的列要有姓名與地址"),
            new Issue(6, IssueKind.TOO_LONG, "吳丁", "姓名超過 50 字"),
            new Issue(7, IssueKind.TOO_LONG, "吳戊", "地址超過 200 字"),
            new Issue(8, IssueKind.TOO_LONG, "吳己", "來源超過 50 字"),
            new Issue(9, IssueKind.ZIP, "吳庚", "郵遞區號「12」不是 3 或 5 碼數字，留空"),
            new Issue(10, IssueKind.DUPLICATE, "吳辛", "戶 " + h.getHouseholdNumber() + " 已在名單，略過"));
        assertThat(recipients.findByHouseholdId(h.getId())).isEmpty();
    }

    @Test
    void householdNumberSavedByExcelWithZeroFractionIsAccepted() {
        Household one = household("吳整數一");
        Household two = household("吳整數二");
        int n1 = one.getHouseholdNumber();
        int n2 = two.getHouseholdNumber();
        String csv = "戶號,姓名\n"
            + n1 + ".0,吳一\n"
            + " " + n2 + ".00 ,吳二\n"
            + n1 + ".5,吳三\n"
            + n2 + ".,吳四\n"
            + "1e2,吳五\n"
            + n1 + ".000,吳六\n"
            + "999998.0,吳七\n";

        Report report = importer.run(csv, admin(), false);

        assertThat(report.linked()).isEqualTo(2);
        assertThat(report.issues()).containsExactly(
            new Issue(4, IssueKind.HOUSEHOLD, "吳三", "戶號「" + n1 + ".5」不是數字"),
            new Issue(5, IssueKind.HOUSEHOLD, "吳四", "戶號「" + n2 + ".」不是數字"),
            new Issue(6, IssueKind.HOUSEHOLD, "吳五", "戶號「1e2」不是數字"),
            new Issue(7, IssueKind.DUPLICATE, "吳六", "戶 " + n1 + " 已在名單，略過"),
            new Issue(8, IssueKind.HOUSEHOLD, "吳七", "找不到戶 999998"));
    }

    @Test
    void linkedRowUsesRecipientColumnAndIgnoresAddressAndShortRowsReadAsBlank() {
        Household h = household("吳連結");
        String csv = "姓名,地址,戶號,收件人,郵遞區號,備註,來源\r\n"
            + "不印這個名字,不存這個地址," + h.getHouseholdNumber() + ",吳太太,40441,,名單 A\r\n"
            + "吳短列,臺中市北區短列路3號\r\n";

        Report report = importer.run(csv, admin(), true);

        assertThat(report.linked()).isEqualTo(1);
        assertThat(report.standalone()).isEqualTo(1);
        assertThat(report.issues()).isEmpty();
        MailingRecipient linked = recipients.findByHouseholdId(h.getId()).orElseThrow();
        assertThat(linked.getRecipientName()).isEqualTo("吳太太");
        assertThat(linked.getAddress()).isNull();
        assertThat(linked.getZip()).isEqualTo("40441");
        assertThat(linked.getSource()).isEqualTo("名單 A");
        assertThat(linked.isActive()).isTrue();
        MailingRecipient shortRow = recipients.findAllOrdered().stream()
            .filter(r -> "吳短列".equals(r.getRecipientName())).findFirst().orElseThrow();
        assertThat(shortRow.getHousehold()).isNull();
        assertThat(shortRow.getAddress()).isEqualTo("臺中市北區短列路3號");
        assertThat(shortRow.getZip()).isNull();
        assertThat(shortRow.getNote()).isNull();
        assertThat(shortRow.getSource()).isNull();

        List<AuditLog> linkedAudit = auditLogs.findByTableNameAndRowIdOrderByIdDesc(MailingService.TABLE, linked.getId());
        assertThat(linkedAudit).singleElement().satisfies(log -> {
            assertThat(log.getAction()).isEqualTo("INSERT");
            assertThat(log.getBeforeData()).isNull();
            assertThat(log.getChangedBy()).isEqualTo(admin().getId());
        });
        assertThat(auditLogs.findByTableNameAndRowIdOrderByIdDesc(MailingService.TABLE, shortRow.getId())).hasSize(1);

        mailing.delete(linked.getId(), admin());
        mailing.delete(shortRow.getId(), admin());
    }

    @Test
    void standaloneDuplicatesAreDetectedAfterAddressNormalization() {
        String csv = "姓名,地址\n"
            + "吳正規,台中市 北區 正規路5號\n"
            + "吳正規,臺中市北區正規路5號\n";

        Report report = importer.run(csv, admin(), false);

        assertThat(report.standalone()).isEqualTo(1);
        assertThat(report.issues()).containsExactly(new Issue(3, IssueKind.DUPLICATE, "吳正規", "同名同地址已在名單，略過"));
    }
}
