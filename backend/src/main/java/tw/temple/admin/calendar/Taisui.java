package tw.temple.admin.calendar;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Taisui {

    public static final List<String> ALL_RELATIONS = List.of("值", "沖", "刑", "害", "破");

    private static final List<String> TRIPLE_PUNISHMENT = List.of("寅巳申", "丑戌未");
    private static final String MUTUAL_PUNISHMENT = "子卯";
    private static final String SELF_PUNISHMENT = "辰午酉亥";
    private static final List<String> HARM = List.of("子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌");
    private static final List<String> BREAK = List.of("子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌");

    private Taisui() {
    }

    /** 回傳「成員地支 → 關係名稱」，只含啟用的關係；同一地支符合多種關係時取順序較前者。 */
    public static Map<Character, String> relationsFor(char yearBranch, Set<String> enabled) {
        Map<Character, String> result = new LinkedHashMap<>();
        int y = Ganzhi.branchIndex(yearBranch);
        if (y < 0) {
            return result;
        }
        if (enabled.contains("值")) {
            result.putIfAbsent(yearBranch, "值太歲");
        }
        if (enabled.contains("沖")) {
            result.putIfAbsent(Ganzhi.BRANCHES.charAt((y + 6) % 12), "沖太歲");
        }
        if (enabled.contains("刑")) {
            for (char b : punishedBy(yearBranch)) {
                result.putIfAbsent(b, "刑太歲");
            }
        }
        if (enabled.contains("害")) {
            char partner = partner(HARM, yearBranch);
            if (partner != 0) {
                result.putIfAbsent(partner, "害太歲");
            }
        }
        if (enabled.contains("破")) {
            char partner = partner(BREAK, yearBranch);
            if (partner != 0) {
                result.putIfAbsent(partner, "破太歲");
            }
        }
        return result;
    }

    private static List<Character> punishedBy(char yearBranch) {
        for (String group : TRIPLE_PUNISHMENT) {
            if (group.indexOf(yearBranch) >= 0) {
                return group.chars().mapToObj(c -> (char) c).filter(c -> c != yearBranch).toList();
            }
        }
        if (MUTUAL_PUNISHMENT.indexOf(yearBranch) >= 0) {
            return List.of(MUTUAL_PUNISHMENT.charAt(1 - MUTUAL_PUNISHMENT.indexOf(yearBranch)));
        }
        if (SELF_PUNISHMENT.indexOf(yearBranch) >= 0) {
            return List.of(yearBranch);
        }
        return List.of();
    }

    private static char partner(List<String> pairs, char branch) {
        for (String pair : pairs) {
            int idx = pair.indexOf(branch);
            if (idx >= 0) {
                return pair.charAt(1 - idx);
            }
        }
        return 0;
    }
}
