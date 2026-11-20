package tw.temple.admin.mailing;

import jakarta.validation.constraints.Size;
import java.util.regex.Pattern;

public final class MailingDtos {

    private static final Pattern ZIP = Pattern.compile("\\d{3}(\\d{2})?");

    private MailingDtos() {
    }

    /**
     * householdNumber 有值就是連到戶的列，姓名／地址印戶長與戶地址，recipientName 只在要改收件人時填。
     * version 是編輯時帶回讀出的值，別人中途改過就回 409；不帶就不檢查。
     */
    public record MailingInput(Integer householdNumber, @Size(max = 50) String recipientName, @Size(max = 6) String zip,
                               @Size(max = 200) String address, @Size(max = 200) String note, Boolean active, Integer version) {

        public MailingRecipientFields toFields() {
            return new MailingRecipientFields(blankToNull(recipientName), blankToNull(zip), blankToNull(address), blankToNull(note),
                active == null || active);
        }
    }

    /** address 是可直接印的完整地址；city／district 給前端查郵遞區號用，連到戶的列取戶的，其餘從地址拆；overseas 的列標籤不印。 */
    public record MailingView(Long id, Long householdId, Integer householdNumber, String headName, String recipientName, String name,
                              String zip, String city, String district, String address, boolean active, boolean overseas,
                              String source, String note, int version) {
    }

    public record ActiveInput(boolean active) {
    }

    static boolean isZip(String zip) {
        return ZIP.matcher(zip).matches();
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
