package tw.temple.admin.household;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** 全臺 22 縣市與 368 鄉鎮市區，與前端 lib/taiwan.ts 同一份；拆地址時「台」視同「臺」，舊縣市名換成現名。 */
public final class TaiwanAddress {

    /** districtGuessed：鄉鎮市區是靠「市/鎮/鄉」尾字互換猜出來的，例如「三重市」對到「三重區」。 */
    public record Split(String city, String district, String street, String raw, boolean districtGuessed) {

        public boolean hasCity() {
            return city != null;
        }

        public boolean hasDistrict() {
            return district != null;
        }
    }

    private static final Map<String, List<String>> DISTRICTS = districts(
        entry("臺北市", "中正區 大同區 中山區 松山區 大安區 萬華區 信義區 士林區 北投區 內湖區 南港區 文山區"),
        entry("新北市", "萬里區 金山區 板橋區 汐止區 深坑區 石碇區 瑞芳區 平溪區 雙溪區 貢寮區 新店區 坪林區 烏來區 永和區 中和區 土城區 三峽區 樹林區 鶯歌區 三重區 新莊區 泰山區 林口區 蘆洲區 五股區 八里區 淡水區 三芝區 石門區"),
        entry("桃園市", "中壢區 平鎮區 龍潭區 楊梅區 新屋區 觀音區 桃園區 龜山區 八德區 大溪區 復興區 大園區 蘆竹區"),
        entry("臺中市", "中區 東區 南區 西區 北區 北屯區 西屯區 南屯區 太平區 大里區 霧峰區 烏日區 豐原區 后里區 石岡區 東勢區 和平區 新社區 潭子區 大雅區 神岡區 大肚區 沙鹿區 龍井區 梧棲區 清水區 大甲區 外埔區 大安區"),
        entry("臺南市", "中西區 東區 南區 北區 安平區 安南區 永康區 歸仁區 新化區 左鎮區 玉井區 楠西區 南化區 仁德區 關廟區 龍崎區 官田區 麻豆區 佳里區 西港區 七股區 將軍區 學甲區 北門區 新營區 後壁區 白河區 東山區 六甲區 下營區 柳營區 鹽水區 善化區 大內區 山上區 新市區 安定區"),
        entry("高雄市", "新興區 前金區 苓雅區 鹽埕區 鼓山區 旗津區 前鎮區 三民區 楠梓區 小港區 左營區 仁武區 大社區 岡山區 路竹區 阿蓮區 田寮區 燕巢區 橋頭區 梓官區 彌陀區 永安區 湖內區 鳳山區 大寮區 林園區 鳥松區 大樹區 旗山區 美濃區 六龜區 內門區 杉林區 甲仙區 桃源區 那瑪夏區 茂林區 茄萣區"),
        entry("基隆市", "仁愛區 信義區 中正區 中山區 安樂區 暖暖區 七堵區"),
        entry("新竹市", "東區 北區 香山區"),
        entry("嘉義市", "東區 西區"),
        entry("新竹縣", "竹北市 湖口鄉 新豐鄉 新埔鎮 關西鎮 芎林鄉 寶山鄉 竹東鎮 五峰鄉 橫山鄉 尖石鄉 北埔鄉 峨眉鄉"),
        entry("苗栗縣", "竹南鎮 頭份市 三灣鄉 南庄鄉 獅潭鄉 後龍鎮 通霄鎮 苑裡鎮 苗栗市 造橋鄉 頭屋鄉 公館鄉 大湖鄉 泰安鄉 銅鑼鄉 三義鄉 西湖鄉 卓蘭鎮"),
        entry("彰化縣", "彰化市 芬園鄉 花壇鄉 秀水鄉 鹿港鎮 福興鄉 線西鄉 和美鎮 伸港鄉 員林市 社頭鄉 永靖鄉 埔心鄉 溪湖鎮 大村鄉 埔鹽鄉 田中鎮 北斗鎮 田尾鄉 埤頭鄉 溪州鄉 竹塘鄉 二林鎮 大城鄉 芳苑鄉 二水鄉"),
        entry("南投縣", "南投市 中寮鄉 草屯鎮 國姓鄉 埔里鎮 仁愛鄉 名間鄉 集集鎮 水里鄉 魚池鄉 信義鄉 竹山鎮 鹿谷鄉"),
        entry("雲林縣", "斗南鎮 大埤鄉 虎尾鎮 土庫鎮 褒忠鄉 東勢鄉 臺西鄉 崙背鄉 麥寮鄉 斗六市 林內鄉 古坑鄉 莿桐鄉 西螺鎮 二崙鄉 北港鎮 水林鄉 口湖鄉 四湖鄉 元長鄉"),
        entry("嘉義縣", "番路鄉 梅山鄉 竹崎鄉 阿里山鄉 中埔鄉 大埔鄉 水上鄉 鹿草鄉 太保市 朴子市 東石鄉 六腳鄉 新港鄉 民雄鄉 大林鎮 溪口鄉 義竹鄉 布袋鎮"),
        entry("屏東縣", "屏東市 三地門鄉 霧臺鄉 瑪家鄉 九如鄉 里港鄉 高樹鄉 鹽埔鄉 長治鄉 麟洛鄉 竹田鄉 內埔鄉 萬丹鄉 潮州鎮 泰武鄉 來義鄉 萬巒鄉 崁頂鄉 新埤鄉 南州鄉 林邊鄉 東港鎮 琉球鄉 佳冬鄉 新園鄉 枋寮鄉 枋山鄉 春日鄉 獅子鄉 車城鄉 牡丹鄉 恆春鎮 滿州鄉"),
        entry("宜蘭縣", "宜蘭市 頭城鎮 礁溪鄉 壯圍鄉 員山鄉 羅東鎮 三星鄉 大同鄉 五結鄉 冬山鄉 蘇澳鎮 南澳鄉"),
        entry("花蓮縣", "花蓮市 新城鄉 秀林鄉 吉安鄉 壽豐鄉 鳳林鎮 光復鄉 豐濱鄉 瑞穗鄉 萬榮鄉 玉里鎮 卓溪鄉 富里鄉"),
        entry("臺東縣", "臺東市 綠島鄉 蘭嶼鄉 延平鄉 卑南鄉 鹿野鄉 關山鎮 海端鄉 池上鄉 東河鄉 成功鎮 長濱鄉 太麻里鄉 金峰鄉 大武鄉 達仁鄉"),
        entry("澎湖縣", "馬公市 西嶼鄉 望安鄉 七美鄉 白沙鄉 湖西鄉"),
        entry("金門縣", "金沙鎮 金湖鎮 金寧鄉 金城鎮 烈嶼鄉 烏坵鄉"),
        entry("連江縣", "南竿鄉 北竿鄉 莒光鄉 東引鄉")
    );

    private static final Map<String, String> RENAMED_CITIES = Map.of(
        "臺北縣", "新北市", "桃園縣", "桃園市", "臺中縣", "臺中市", "臺南縣", "臺南市", "高雄縣", "高雄市");
    private static final String DISTRICT_SUFFIXES = "區市鎮鄉";
    /** 金門、馬祖的郵局寫法會帶「福建省」，不是國外。 */
    private static final Pattern PROVINCE_PREFIX = Pattern.compile("^(臺灣省|福建省(?=金門|連江))");
    private static final Pattern CJK = Pattern.compile("[\\u4e00-\\u9fff]");
    private static final Pattern LATIN_WORD = Pattern.compile("[A-Za-z]{3,}");
    private static final Pattern FOREIGN_CJK = Pattern.compile(
        "中國|大陸|上海市|北京市|天津市|重慶市|香港|澳門|美國|日本|加拿大|澳洲|澳大利亞|馬來西亞|新加坡|英國|德國|法國|紐西蘭|泰國|越南"
            + "|印尼|菲律賓|韓國|荷蘭|瑞士|義大利|西班牙|巴西|阿根廷|南非|緬甸|柬埔寨|汶萊|印度|杜拜|阿聯|[\\u4e00-\\u9fff]{1,3}省");
    private static final Pattern FOREIGN_LATIN = Pattern.compile(
        "(?i)\\b(usa|u\\.s\\.a|united ?states|america|canada|australia|japan|singapore|malaysia|china|hong ?kong|maca[ou]"
            + "|united ?kingdom|england|britain|germany|france|new ?zealand|thailand|vietnam|indonesia|philippines|korea"
            + "|netherlands|switzerland|italy|spain|brazil|india|dubai|uae)\\b");
    private static final Pattern TAIWAN_LATIN = Pattern.compile(
        "(?i)taiwan|\\br\\.?o\\.?c\\b|taipei|taichung|taoyuan|tainan|kaohsiung|keelung|hsinchu|chiayi|changhua|nantou|yunlin"
            + "|pingtung|yilan|ilan|hualien|taitung|penghu|kinmen|lienchiang|matsu|miaoli");

    private TaiwanAddress() {
    }

    /** 中文字與數字之間的空白拿掉、英文字之間的留著；開頭接著縣市名的 3／5 碼郵遞區號去掉。 */
    public static String normalize(String address) {
        return address.trim()
            .replace('台', '臺')
            .replaceAll("(?<=[\\u4e00-\\u9fff0-9])[\\s\\u3000]+(?=[\\u4e00-\\u9fff0-9])", "")
            .replaceAll("[\\s\\u3000]+", " ")
            .replaceFirst("^\\d{3}(\\d{2})?(?=[\\u4e00-\\u9fff])(?![號巷弄樓室段路街村鄰里])", "")
            .trim();
    }

    public static Split split(String rawAddress) {
        String raw = rawAddress == null ? "" : rawAddress.trim();
        if (raw.isEmpty()) {
            return new Split(null, null, null, null, false);
        }
        String rest = stripProvince(normalize(raw));
        String city = null;
        for (Map.Entry<String, String> renamed : RENAMED_CITIES.entrySet()) {
            if (rest.startsWith(renamed.getKey())) {
                city = renamed.getValue();
                rest = rest.substring(renamed.getKey().length());
            }
        }
        if (city == null) {
            for (String candidate : DISTRICTS.keySet()) {
                if (rest.startsWith(candidate)) {
                    city = candidate;
                    rest = rest.substring(candidate.length());
                    break;
                }
            }
        }
        if (city == null) {
            return new Split(null, null, raw, raw, false);
        }
        List<String> districts = DISTRICTS.get(city);
        for (String district : districts) {
            if (rest.startsWith(district)) {
                return new Split(city, district, blankToNull(rest.substring(district.length())), raw, false);
            }
        }
        for (String district : districts) {
            String base = district.substring(0, district.length() - 1);
            if (rest.startsWith(base) && rest.length() > base.length() && DISTRICT_SUFFIXES.indexOf(rest.charAt(base.length())) >= 0) {
                return new Split(city, district, blankToNull(rest.substring(base.length() + 1)), raw, true);
            }
        }
        return new Split(city, null, blankToNull(rest), raw, false);
    }

    /** 拆不出臺灣縣市，又出現國名、省名、英文國名，或整串只有英文沒有中文的地址視為國外，帖子不寄。 */
    public static boolean isOverseas(String address) {
        if (address == null || address.isBlank() || split(address).hasCity()) {
            return false;
        }
        String rest = stripProvince(normalize(address));
        if (TAIWAN_LATIN.matcher(rest).find()) {
            return false;
        }
        if (FOREIGN_CJK.matcher(rest).find() || FOREIGN_LATIN.matcher(rest).find()) {
            return true;
        }
        return !CJK.matcher(rest).find() && LATIN_WORD.matcher(rest).find();
    }

    private static String stripProvince(String s) {
        return PROVINCE_PREFIX.matcher(s).replaceFirst("");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    @SafeVarargs
    private static Map<String, List<String>> districts(Map.Entry<String, String>... entries) {
        Map<String, List<String>> map = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : entries) {
            map.put(e.getKey(), Arrays.stream(e.getValue().split(" "))
                .sorted(Comparator.comparingInt(String::length).reversed())
                .toList());
        }
        return map;
    }

    private static Map.Entry<String, String> entry(String city, String districts) {
        return Map.entry(city, districts);
    }
}
