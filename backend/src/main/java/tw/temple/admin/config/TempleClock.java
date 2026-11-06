package tw.temple.admin.config;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TempleClock {

    private final ZoneId zone;

    public TempleClock(@Value("${temple.zone:Asia/Taipei}") String zone) {
        this.zone = ZoneId.of(zone);
    }

    public LocalDate today() {
        return LocalDate.now(zone);
    }

    public OffsetDateTime now() {
        return OffsetDateTime.now(zone);
    }

    public ZoneId zone() {
        return zone;
    }
}
