package tw.temple.admin.closing;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyClosingRepository extends JpaRepository<DailyClosing, LocalDate> {

    Optional<DailyClosing> findTopByOrderByClosingDateDesc();

    List<DailyClosing> findAllByOrderByClosingDateDesc();
}
