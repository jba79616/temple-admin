package tw.temple.admin.household;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tw.temple.admin.household.TaiwanAddress.Split;

class TaiwanAddressTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "上海市復興中路1340弄1號1102室",
        "廣東省深圳市南山區前海路3001號新德家園A棟10D",
        "123 Main St, San Jose, CA 95112, USA",
        "日本東京都新宿區西新宿2-8-1",
        "香港九龍彌敦道100號",
        "福建省廈門市思明區湖濱南路1號",
        "1 Infinite Loop, Cupertino, CA 95014",
    })
    void flagsAddressesOutsideTaiwan(String address) {
        assertThat(TaiwanAddress.isOverseas(address)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "臺中市大里區中興路二段816巷7號5樓",
        "台灣省台中縣大里市中興路二段816巷7號",
        "大里區中興路二段816巷7號",
        "No. 7, Ln. 816, Sec. 2, Zhongxing Rd., Dali Dist., Taichung City, Taiwan",
        "臺中市西屯區臺灣大道三段99號(ABC Company)",
        "福建省金門縣金城鎮民生路1號",
        "福建省連江縣南竿鄉介壽村1號",
        "板橋區文化路一段100號ABC大樓",
        "中和市景平路12號 No.12 Lane 3",
        "Dali Dist., Taichung City 412",
        "",
    })
    void keepsTaiwanAddresses(String address) {
        assertThat(TaiwanAddress.isOverseas(address)).isFalse();
    }

    @Test
    void normalizeDropsSpacesBetweenChineseButKeepsLatinSpacing() {
        assertThat(TaiwanAddress.normalize("106 台北市 大安區 和平東路1號 5樓")).isEqualTo("臺北市大安區和平東路1號5樓");
        assertThat(TaiwanAddress.normalize("100 Main St,  Taipei")).isEqualTo("100 Main St, Taipei");
        assertThat(TaiwanAddress.normalize("816巷7號")).isEqualTo("816巷7號");
    }

    @Test
    void kinmenAndMatsuKeepTheirCountyAfterTheProvincePrefix() {
        Split split = TaiwanAddress.split("福建省金門縣金城鎮民生路1號");
        assertThat(split.city()).isEqualTo("金門縣");
        assertThat(split.district()).isEqualTo("金城鎮");
    }

    @Test
    void stripsTaiwanProvinceAndOldCountyNames() {
        Split split = TaiwanAddress.split("台灣省台中縣大里市中興路二段816巷7號");
        assertThat(split.city()).isEqualTo("臺中市");
        assertThat(split.district()).isEqualTo("大里區");
        assertThat(split.street()).isEqualTo("中興路二段816巷7號");
        assertThat(TaiwanAddress.isOverseas(null)).isFalse();
    }
}
