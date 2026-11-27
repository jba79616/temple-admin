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
    private static final char BYTE_ORDER_MARK = '\uFEFF';

    private WholeNumbers() {
    }

    public static String toHalfWidthDigits(String input) {
        StringBuilder out = new StringBuilder(input.length());
        for (char c : input.toCharArray()) {
            out.append(c >= FULL_WIDTH_ZERO && c <= FULL_WIDTH_NINE ? (char) ('0' + (c - FULL_WIDTH_ZERO)) : c);
        }
        return out.toString();
    }

    /** 全形轉半形再去頭尾空白；空白的範圍比照 JS trim()，含 String.strip() 不認的 NBSP 與 BOM。 */
    public static String normalize(String input) {
        String halfWidth = toHalfWidthDigits(input);
        int start = 0;
        int end = halfWidth.length();
        while (start < end && isTrimmable(halfWidth.charAt(start))) {
            start++;
        }
        while (end > start && isTrimmable(halfWidth.charAt(end - 1))) {
            end--;
        }
        return halfWidth.substring(start, end);
    }

    public static boolean isDigits(String input) {
        return input != null && ASCII_DIGITS.matcher(normalize(input)).matches();
    }

    public static OptionalInt parse(String input) {
        if (!isDigits(input)) {
            return OptionalInt.empty();
        }
        try {
            return OptionalInt.of(Integer.parseInt(normalize(input)));
        } catch (NumberFormatException tooLarge) {
            return OptionalInt.empty();
        }
    }

    private static boolean isTrimmable(char c) {
        return Character.isWhitespace(c) || Character.isSpaceChar(c) || c == BYTE_ORDER_MARK;
    }
}
