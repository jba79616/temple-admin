package tw.temple.admin.mailing;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
        List<Issue> issues = new ArrayList<>();
        Set<Long> linkedHouseholds = new HashSet<>();
        Set<String> standaloneKeys = new HashSet<>();
        int dataRows = 0;
        int linked = 0;
        int standalone = 0;
        int skipped = 0;
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            if (row.stream().allMatch(String::isBlank)) {
                continue;
            }
            dataRows++;
            int line = i + 1;
            String name = cell(row, columns, "name");
            String householdNumber = cell(row, columns, "household");
            boolean linkedRow = householdNumber != null;
            String recipientName = linkedRow ? cell(row, columns, "recipient") : name;
            String address = linkedRow ? null : cell(row, columns, "address");
            String note = cell(row, columns, "note");
            String source = cell(row, columns, "source");
            if (!linkedRow && (name == null || address == null)) {
                issues.add(new Issue(line, IssueKind.REQUIRED, name, "沒有戶號的列要有姓名與地址"));
                skipped++;
                continue;
            }
            String tooLong = tooLong(recipientName, address, note, source);
            if (tooLong != null) {
                issues.add(new Issue(line, IssueKind.TOO_LONG, name, tooLong));
                skipped++;
                continue;
            }
            Household household = null;
            if (linkedRow) {
                household = household(householdNumber, line, name, issues);
                if (household == null) {
                    skipped++;
                    continue;
                }
                if (!linkedHouseholds.add(household.getId()) || recipients.findByHouseholdId(household.getId()).isPresent()) {
                    issues.add(new Issue(line, IssueKind.DUPLICATE, name, "戶 " + householdNumber + " 已在名單，略過"));
                    skipped++;
                    continue;
                }
                linked++;
            } else {
                address = TaiwanAddress.normalize(address);
                if (!standaloneKeys.add(name + "|" + address)
                        || recipients.existsByHouseholdIsNullAndRecipientNameAndAddress(name, address)) {
                    issues.add(new Issue(line, IssueKind.DUPLICATE, name, "同名同地址已在名單，略過"));
                    skipped++;
                    continue;
                }
                standalone++;
            }
            String zip = zip(cell(row, columns, "zip"), line, name, issues);
            MailingRecipient saved = recipients.save(
                new MailingRecipient(household, new MailingRecipientFields(recipientName, zip, address, note, true), source));
            audit.record(MailingService.TABLE, saved.getId(), "INSERT", null, saved.snapshot(), actor);
        }
        if (!commit) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
        return new Report(commit, dataRows, linked, standalone, skipped, List.copyOf(issues));
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

    private String cell(List<String> row, Map<String, Integer> columns, String key) {
        Integer index = columns.get(key);
        if (index == null || index >= row.size()) {
            return null;
        }
        return MailingDtos.blankToNull(row.get(index));
    }

    private String zip(String zip, int line, String name, List<Issue> issues) {
        if (zip == null || MailingDtos.isZip(zip)) {
            return zip;
        }
        issues.add(new Issue(line, IssueKind.ZIP, name, "郵遞區號「" + zip + "」不是 3 或 5 碼數字，留空"));
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

    private Household household(String householdNumber, int line, String name, List<Issue> issues) {
        try {
            return households.findByHouseholdNumber(Integer.parseInt(householdNumber.trim())).orElseGet(() -> {
                issues.add(new Issue(line, IssueKind.HOUSEHOLD, name, "找不到戶 " + householdNumber));
                return null;
            });
        } catch (NumberFormatException e) {
            issues.add(new Issue(line, IssueKind.HOUSEHOLD, name, "戶號「" + householdNumber + "」不是數字"));
            return null;
        }
    }
}
