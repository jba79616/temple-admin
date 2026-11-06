package tw.temple.admin.light;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LightTypeRepository extends JpaRepository<LightType, Long> {

    List<LightType> findAllByOrderBySortOrderAscIdAsc();

    List<LightType> findByActiveTrueOrderBySortOrderAscIdAsc();

    Optional<LightType> findByName(String name);
}
