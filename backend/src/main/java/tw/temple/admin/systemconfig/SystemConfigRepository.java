package tw.temple.admin.systemconfig;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {

    List<SystemConfig> findAllByOrderByKeyAsc();
}
