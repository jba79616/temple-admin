package tw.temple.admin.mailing;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdRepository;
import tw.temple.admin.household.TaiwanAddress;
import tw.temple.admin.user.User;

/**
 * 把帖子名單 CSV 匯進 mailing_recipients。有「戶號」的列連到戶（姓名欄不用，印戶長；要改收件人填「收件人」），
 * 沒有的列自帶姓名與地址。預覽模式跑完整個流程再 rollback，和舊資料匯入一樣。
 */
@Service
public class MailingImportService {

    public enum IssueKind { HOUSEHOLD, REQUIRED, TOO_LONG, ZIP, DUPLICATE }

    public record Issue(int line, IssueKind kind, String name, String detail) {
    }

    public record Report(boolean committed, int rows, int linked, int standalone, int skipped, List<Issue> issues) {
    }

    /** 連到戶的列 recipientName 只取「收件人」欄、address 一律為 null，印的是戶長與戶地址。 */
    private record Row(int line, String name, String householdNumber, String recipientName, String address, String zip,
                       String note, String source) {

        boolean linked() {
            return householdNumber != null;
        }

        Issue issue(IssueKind kind, String detail) {
            return new Issue(line, kind, name, detail);
        }
    }

    private record Destination(Household household, String address) {
    }

    private static final class Batch {
        private final List<Issue> issues = new ArrayList<>();
        private final Set<Long> linkedHouseholds = new HashSet<>();
        private final Set<String> standaloneKeys = new HashSet<>();
        private int rows;
        private int linked;
        private int standalone;
        private int skipped;

        void skip(Issue issue) {
            issues.add(issue);
            skipped++;
        }
    }

    private static final Map<String, List<String>> COLUMNS = Map.of(
        "name", List.of("姓名"),
        "zip", List.of("郵遞區號", "郵遞"),
        "address", List.of("地址", "住址"),
        "household", List.of("戶號"),
        "recipient", List.of("收件人"),
        "note", List.of("備註"),
        "source", List.of("來源"));

    private final MailingRecipientRepository recipients;
    private final HouseholdRepository households;
    private final AuditService audit;

    public MailingImportService(MailingRecipientRepository recipients, HouseholdRepository households, AuditService audit) {
        this.recipients = recipients;
        this.households = households;
        this.audit = audit;
    }

    @Transactional
    public Report run(String csv, User actor, boolean commit) {
        List<List<String>> rows = Csv.parse(csv);
        if (rows.isEmpty()) {
            throw ApiException.badRequest("檔案是空的");
        }
        Map<String, Integer> columns = columns(rows.get(0));
        if (!columns.containsKey("name") && !columns.containsKey("household")) {
            throw ApiException.badRequest("第一列要有欄名，至少要有「姓名」或「戶號」");
        }
        Batch batch = new Batch();
        for (int i = 1; i < rows.size(); i++) {
            List<String> cells = rows.get(i);
            if (!cells.stream().allMatch(String::isBlank)) {
                importRow(readRow(cells, columns, i + 1), batch, actor);
            }
        }
        if (!commit) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
        return new Report(commit, batch.rows, batch.linked, batch.standalone, batch.skipped, List.copyOf(batch.issues));
    }

    private Row readRow(List<String> cells, Map<String, Integer> columns, int line) {
        String name = cell(cells, columns, "name");
        String householdNumber = cell(cells, columns, "household");
        boolean linked = householdNumber != null;
        return new Row(line, name, householdNumber, linked ? cell(cells, columns, "recipient") : name,
            linked ? null : cell(cells, columns, "address"), cell(cells, columns, "zip"), cell(cells, columns, "note"),
            cell(cells, columns, "source"));
    }

    private void importRow(Row row, Batch batch, User actor) {
        batch.rows++;
        if (!row.linked() && (row.name() == null || row.address() == null)) {
            batch.skip(row.issue(IssueKind.REQUIRED, "沒有戶號的列要有姓名與地址"));
            return;
        }
        String tooLong = tooLong(row.recipientName(), row.address(), row.note(), row.source());
        if (tooLong != null) {
            batch.skip(row.issue(IssueKind.TOO_LONG, tooLong));
            return;
        }
        Optional<Destination> destination = row.linked() ? linkedDestination(row, batch) : standaloneDestination(row, batch);
        if (destination.isEmpty()) {
            return;
        }
        String zip = zip(row, batch);
        MailingRecipient saved = recipients.save(new MailingRecipient(destination.get().household(),
            new MailingRecipientFields(row.recipientName(), zip, destination.get().address(), row.note(), true), row.source()));
        audit.record(MailingService.TABLE, saved.getId(), "INSERT", null, saved.snapshot(), actor);
    }

    private Optional<Destination> linkedDestination(Row row, Batch batch) {
        Household household = household(row, batch);
        if (household == null) {
            return Optional.empty();
        }
        if (!batch.linkedHouseholds.add(household.getId()) || recipients.findByHouseholdId(household.getId()).isPresent()) {
            batch.skip(row.issue(IssueKind.DUPLICATE, "戶 " + row.householdNumber() + " 已在名單，略過"));
            return Optional.empty();
        }
        batch.linked++;
        return Optional.of(new Destination(household, null));
    }

    private Optional<Destination> standaloneDestination(Row row, Batch batch) {
        String address = TaiwanAddress.normalize(row.address());
        if (!batch.standaloneKeys.add(row.name() + "|" + address)
                || recipients.existsByHouseholdIsNullAndRecipientNameAndAddress(row.name(), address)) {
            batch.skip(row.issue(IssueKind.DUPLICATE, "同名同地址已在名單，略過"));
            return Optional.empty();
        }
        batch.standalone++;
        return Optional.of(new Destination(null, address));
    }

    private Map<String, Integer> columns(List<String> header) {
        Map<String, Integer> columns = new HashMap<>();
        for (int i = 0; i < header.size(); i++) {
            String title = header.get(i).trim();
            int index = i;
            COLUMNS.forEach((key, aliases) -> {
                if (aliases.contains(title)) {
                    columns.putIfAbsent(key, index);
                }
            });
        }
        return columns;
    }

    private String cell(List<String> cells, Map<String, Integer> columns, String key) {
        Integer index = columns.get(key);
        if (index == null || index >= cells.size()) {
            return null;
        }
        return MailingDtos.blankToNull(cells.get(index));
    }

    private String zip(Row row, Batch batch) {
        String zip = row.zip();
        if (zip == null || MailingDtos.isZip(zip)) {
            return zip;
        }
        batch.issues.add(row.issue(IssueKind.ZIP, "郵遞區號「" + zip + "」不是 3 或 5 碼數字，留空"));
        return null;
    }

    /** 超長的列先略過，不然整批會在寫入時被資料庫擋下、看不到是第幾列。 */
    private String tooLong(String recipientName, String address, String note, String source) {
        if (recipientName != null && recipientName.length() > 50) {
            return "姓名超過 50 字";
        }
        if (address != null && address.length() > 200) {
            return "地址超過 200 字";
        }
        if (note != null && note.length() > 200) {
            return "備註超過 200 字";
        }
        if (source != null && source.length() > 50) {
            return "來源超過 50 字";
        }
        return null;
    }

    private Household household(Row row, Batch batch) {
        String householdNumber = row.householdNumber();
        try {
            return households.findByHouseholdNumber(Integer.parseInt(householdNumber.trim())).orElseGet(() -> {
                batch.skip(row.issue(IssueKind.HOUSEHOLD, "找不到戶 " + householdNumber));
                return null;
            });
        } catch (NumberFormatException e) {
            batch.skip(row.issue(IssueKind.HOUSEHOLD, "戶號「" + householdNumber + "」不是數字"));
            return null;
        }
    }
}
