package tw.temple.admin.order;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByOrderIdOrderByIdAsc(Long orderId);

    @Query("select coalesce(sum(p.amount), 0L) from Payment p where p.order.id = :orderId")
    long sumByOrder(@Param("orderId") Long orderId);

    @Query("""
        select p from Payment p
        where (cast(:after as LocalDate) is null or p.postedOn > :after) and p.postedOn <= :through
          and p.kind <> tw.temple.admin.order.PaymentKind.IMPORT
        order by p.postedOn, p.id""")
    List<Payment> findPostedBetweenExcludingImport(@Param("after") LocalDate after, @Param("through") LocalDate through);

    @Query("""
        select count(p) from Payment p
        where (cast(:after as LocalDate) is null or p.postedOn > :after) and p.postedOn <= :through
          and p.kind <> tw.temple.admin.order.PaymentKind.IMPORT""")
    long countPostedBetweenExcludingImport(@Param("after") LocalDate after, @Param("through") LocalDate through);

    @Query("""
        select coalesce(sum(p.amount), 0L) from Payment p
        where p.kind = :kind and (cast(:after as LocalDate) is null or p.postedOn > :after) and p.postedOn <= :through""")
    long sumByKindPostedBetween(@Param("kind") PaymentKind kind, @Param("after") LocalDate after, @Param("through") LocalDate through);
}
