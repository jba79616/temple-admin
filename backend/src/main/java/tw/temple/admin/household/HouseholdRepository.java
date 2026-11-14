package tw.temple.admin.household;

import java.util.List;
import org.springframework.data.domain.Page;
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

    List<Household> findByLegacyIdIsNotNull();

    @Query(value = "select h from Household h order by h.householdNumber", countQuery = "select count(h) from Household h")
    Page<Household> pageAll(Pageable pageable);

    @Query(value = """
        select h from Household h
        where exists (select r.id from AnnualLightRecord r where r.household = h and r.year = :year and r.active = true)
        order by h.householdNumber
        """, countQuery = """
        select count(h) from Household h
        where exists (select r.id from AnnualLightRecord r where r.household = h and r.year = :year and r.active = true)
        """)
    Page<Household> pageLit(@Param("year") int year, Pageable pageable);
}
