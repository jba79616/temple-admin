package tw.temple.admin.household;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HouseholdRepository extends JpaRepository<Household, Long> {

    @Query("""
        select distinct h from Household h
        left join Member m on m.household = h and m.deletedAt is null
        where :q = ''
           or cast(h.householdNumber as string) = :q
           or h.phone like concat('%', :q, '%')
           or m.name like concat('%', :q, '%')
           or m.phone like concat('%', :q, '%')
        order by h.householdNumber
        """)
    List<Household> search(@Param("q") String q, Pageable pageable);

    List<Household> findAllByOrderByHouseholdNumberAsc();
}
