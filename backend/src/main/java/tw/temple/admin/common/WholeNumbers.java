package tw.temple.admin.common;

import java.util.OptionalInt;
import java.util.regex.Pattern;

/**
 * 使用者輸入的整數（金額、戶號等）共用的解析規則，和前端 lib/numbers.ts 一致：全形數字先轉半形，
 * 只收 0–9，不收正負號、小數點或其他符號，上限是 INT 欄位的 Integer.MAX_VALUE。
 * 不直接用 Integer.parseInt，因為它會讓 "+12"、"-12" 和其他語系的數字過關。
 */
public final class WholeNumbers {

    private static final Pattern ASCII_DIGITS = Pattern.compile("[0-9]+");
    private static final char FULL_WIDTH_ZERO = '０';
    private static final char FULL_WIDTH_NINE = '９';

    private WholeNumbers() {
    }

    public static String toHalfWidthDigits(String input) {
        StringBuilder out = new StringBuilder(input.length());
        for (char c : input.toCharArray()) {
            out.append(c >= FULL_WIDTH_ZERO && c <= FULL_WIDTH_NINE ? (char) ('0' + (c - FULL_WIDTH_ZERO)) : c);
        }
        return out.toString();
    }

    public static OptionalInt parse(String input) {
        if (input == null) {
            return OptionalInt.empty();
        }
        String digits = toHalfWidthDigits(input).strip();
        if (!ASCII_DIGITS.matcher(digits).matches()) {
            return OptionalInt.empty();
        }
        try {
            return OptionalInt.of(Integer.parseInt(digits));
        } catch (NumberFormatException tooLarge) {
            return OptionalInt.empty();
        }
    }
}
