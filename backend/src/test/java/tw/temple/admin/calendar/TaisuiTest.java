package tw.temple.admin.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TaisuiTest {

    private static final Set<String> ALL = Set.of("值", "沖", "刑", "害", "破");

    @Test
    void dingWeiYearFlagsGoatOxDogRat() {
        Map<Character, String> relations = Taisui.relationsFor('未', ALL);
        assertThat(relations).containsEntry('未', "值太歲")
            .containsEntry('丑', "沖太歲")
            .containsEntry('戌', "刑太歲")
            .containsEntry('子', "害太歲")
            .hasSize(4);
    }

    @Test
    void bingWuYearIncludesSelfPunishmentAsZhi() {
        Map<Character, String> relations = Taisui.relationsFor('午', ALL);
        assertThat(relations).containsEntry('午', "值太歲")
            .containsEntry('子', "沖太歲")
            .containsEntry('丑', "害太歲")
            .containsEntry('卯', "破太歲")
            .hasSize(4);
    }

    @Test
    void disabledRelationsAreSkipped() {
        Map<Character, String> relations = Taisui.relationsFor('未', Set.of("值", "沖"));
        assertThat(relations).containsOnlyKeys('未', '丑');
    }
}
