package tw.temple.admin.order;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LightOrderItemRepository extends JpaRepository<LightOrderItem, Long> {

    List<LightOrderItem> findByOrderIdOrderByIdAsc(Long orderId);

    List<LightOrderItem> findAllByOrderByIdAsc();
}
