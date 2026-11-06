package tw.temple.admin.calendar;

public final class Ganzhi {

    public static final String STEMS = "甲乙丙丁戊己庚辛壬癸";
    public static final String BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
    private static final String ZODIAC = "鼠牛虎兔龍蛇馬羊猴雞狗豬";

    private Ganzhi() {
    }

    public static String ofYear(int year) {
        return "" + STEMS.charAt(Math.floorMod(year - 4, 10)) + BRANCHES.charAt(Math.floorMod(year - 4, 12));
    }

    public static char branchOfYear(int year) {
        return BRANCHES.charAt(Math.floorMod(year - 4, 12));
    }

    public static int branchIndex(char branch) {
        return BRANCHES.indexOf(branch);
    }

    public static boolean isValid(String ganzhi) {
        if (ganzhi == null || ganzhi.length() != 2) {
            return false;
        }
        int stem = STEMS.indexOf(ganzhi.charAt(0));
        int branch = BRANCHES.indexOf(ganzhi.charAt(1));
        return stem >= 0 && branch >= 0 && stem % 2 == branch % 2;
    }

    public static String zodiac(char branch) {
        int idx = BRANCHES.indexOf(branch);
        return idx < 0 ? null : String.valueOf(ZODIAC.charAt(idx));
    }

    public static String zodiacOf(String ganzhi) {
        return isValid(ganzhi) ? zodiac(ganzhi.charAt(1)) : null;
    }

    public static int roc(int year) {
        return year - 1911;
    }
}
