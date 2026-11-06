package tw.temple.admin.household;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

    List<Member> findByHouseholdIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(Long householdId);

    List<Member> findByHouseholdIdOrderBySortOrderAscIdAsc(Long householdId);

    Optional<Member> findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(Long householdId);

    int countByHouseholdIdAndDeletedAtIsNull(Long householdId);

    @Query("""
        select m from Member m join fetch m.household h
        where m.deletedAt is null
        order by h.householdNumber, m.sortOrder, m.id
        """)
    List<Member> findAllActiveOrdered();

    @Query("select coalesce(max(m.sortOrder), 0) from Member m where m.household.id = :householdId")
    int maxSortOrder(@Param("householdId") Long householdId);
}
