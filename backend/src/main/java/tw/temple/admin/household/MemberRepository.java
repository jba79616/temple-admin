package tw.temple.admin.household;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

    List<Member> findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(Long householdId);

    Optional<Member> findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(Long householdId);

    List<Member> findByHouseholdIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(Long householdId);

    int countByHouseholdIdAndDeletedAtIsNull(Long householdId);

    List<Member> findByLegacyIdIsNotNull();

    @Query("""
        select m from Member m join fetch m.household h
        where m.deletedAt is null
        order by h.householdNumber, m.sortOrder, m.id
        """)
    List<Member> findAllActiveOrdered();

    List<Member> findByHouseholdIdInAndDeletedAtIsNullOrderBySortOrderAscIdAsc(Collection<Long> householdIds);

    @Query(value = "select m from Member m join fetch m.household where m.deletedAt is null order by m.id",
           countQuery = "select count(m) from Member m where m.deletedAt is null")
    Page<Member> pageActive(Pageable pageable);

    @Query(value = """
        select m from Member m join fetch m.household
        where m.deletedAt is null
          and exists (select r.id from AnnualLightRecord r where r.member = m and r.year = :year and r.active = true)
        order by m.id
        """, countQuery = """
        select count(m) from Member m
        where m.deletedAt is null
          and exists (select r.id from AnnualLightRecord r where r.member = m and r.year = :year and r.active = true)
        """)
    Page<Member> pageLit(@Param("year") int year, Pageable pageable);

    @Query("select coalesce(max(m.sortOrder), 0) from Member m where m.household.id = :householdId")
    int maxSortOrder(@Param("householdId") Long householdId);
}
