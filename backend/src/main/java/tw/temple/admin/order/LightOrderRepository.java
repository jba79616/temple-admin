package tw.temple.admin.order;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LightOrderRepository extends JpaRepository<LightOrder, Long> {

    List<LightOrder> findByHouseholdIdOrderByIdDesc(Long householdId);

    List<LightOrder> findByCorrectsOrderIdOrderByIdAsc(Long orderId);

    @Query("""
        select o from LightOrder o
        where o.status = tw.temple.admin.order.OrderStatus.ACTIVE
          and o.totalDue <> coalesce((select sum(p.amount) from Payment p where p.order = o), 0)
        order by o.id desc
        """)
    List<LightOrder> findUnsettled();
}
