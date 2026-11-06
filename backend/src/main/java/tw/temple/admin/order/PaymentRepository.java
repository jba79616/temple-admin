package tw.temple.admin.order;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByOrderIdOrderByIdAsc(Long orderId);

    List<Payment> findByPostedOnOrderByIdAsc(LocalDate postedOn);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.order.id = :orderId")
    int sumByOrder(@Param("orderId") Long orderId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.kind = :kind and p.postedOn = :date")
    int sumByKindAndPostedOn(@Param("kind") PaymentKind kind, @Param("date") LocalDate date);
}
