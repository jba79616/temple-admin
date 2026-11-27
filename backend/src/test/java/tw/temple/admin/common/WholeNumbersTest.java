package tw.temple.admin.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.OptionalInt;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class WholeNumbersTest {

    @Test
    void convertsFullWidthDigitsAndLeavesEverythingElseAlone() {
        assertThat(WholeNumbers.toHalfWidthDigits("０１２３４５６７８９")).isEqualTo("0123456789");
        assertThat(WholeNumbers.toHalfWidthDigits("１２.0 號")).isEqualTo("12.0 號");
    }

    @Test
    void acceptsPlainAndFullWidthDigitsWithSurroundingSpaces() {
        assertThat(WholeNumbers.parse("4300")).hasValue(4300);
        assertThat(WholeNumbers.parse("0")).hasValue(0);
        assertThat(WholeNumbers.parse("007")).hasValue(7);
        assertThat(WholeNumbers.parse(" 4300 ")).hasValue(4300);
        assertThat(WholeNumbers.parse("４３００")).hasValue(4300);
        assertThat(WholeNumbers.parse("４3０0")).hasValue(4300);
        assertThat(WholeNumbers.parse("\u3000１２\u3000")).hasValue(12);
    }

    @Test
    void trimsTheSameSpacesAsJavaScriptTrim() {
        assertThat(WholeNumbers.normalize("\u00A0\uFEFF\t１２\u202F\n")).isEqualTo("12");
        assertThat(WholeNumbers.parse("12\u00A0")).hasValue(12);
        assertThat(WholeNumbers.normalize("1\u00A02")).isEqualTo("1\u00A02");
    }

    @Test
    void tellsDigitsApartFromMalformedInputEvenWhenTooLarge() {
        assertThat(WholeNumbers.isDigits("２147483648")).isTrue();
        assertThat(WholeNumbers.isDigits("-1")).isFalse();
        assertThat(WholeNumbers.isDigits("")).isFalse();
        assertThat(WholeNumbers.isDigits(null)).isFalse();
    }

    @Test
    void stopsAtTheIntUpperBound() {
        assertThat(WholeNumbers.parse("2147483647")).hasValue(Integer.MAX_VALUE);
        assertThat(WholeNumbers.parse("2147483648")).isEmpty();
        assertThat(WholeNumbers.parse("99999999999999999999999")).isEmpty();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "  ", "-1", "+5", "－5", "＋5", "12.5", "12.0", "1e2", "0x10", "abc", "1 000", "1,000", "٣", "१२"})
    void rejectsAnythingButDigits(String input) {
        assertThat(WholeNumbers.parse(input)).isEqualTo(OptionalInt.empty());
    }
}
