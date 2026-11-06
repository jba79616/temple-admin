package tw.temple.admin.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GanzhiTest {

    @Test
    void yearToGanzhi() {
        assertThat(Ganzhi.ofYear(2024)).isEqualTo("甲辰");
        assertThat(Ganzhi.ofYear(2027)).isEqualTo("丁未");
        assertThat(Ganzhi.ofYear(1984)).isEqualTo("甲子");
        assertThat(Ganzhi.branchOfYear(2026)).isEqualTo('午');
    }

    @Test
    void validityFollowsParity() {
        assertThat(Ganzhi.isValid("甲子")).isTrue();
        assertThat(Ganzhi.isValid("甲戌")).isTrue();
        assertThat(Ganzhi.isValid("甲丑")).isFalse();
        assertThat(Ganzhi.isValid("子甲")).isFalse();
        assertThat(Ganzhi.isValid("吉")).isFalse();
        assertThat(Ganzhi.isValid(null)).isFalse();
    }

    @Test
    void zodiacAndRoc() {
        assertThat(Ganzhi.zodiacOf("辛亥")).isEqualTo("豬");
        assertThat(Ganzhi.zodiac('未')).isEqualTo("羊");
        assertThat(Ganzhi.roc(2027)).isEqualTo(116);
    }
}
