package tw.temple.admin.order;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class AnnualLightRecordTest {

    @Test
    void onlyRelightingAnInactiveLampClearsThePrintedCard() {
        AnnualLightRecord record = new AnnualLightRecord(2026, null, null, null, 500, null);
        record.markCardPrinted(OffsetDateTime.now());

        record.activate(600, null, null);
        assertThat(record.getCardPrintedAt()).as("重建狀態表只修單價").isNotNull();

        record.deactivate(null);
        record.activate(600, null, null);
        assertThat(record.getCardPrintedAt()).isNull();
    }
}
