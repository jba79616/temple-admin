package tw.temple.admin.order;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.Member;

public interface AnnualLightRecordRepository extends JpaRepository<AnnualLightRecord, Long> {

    Optional<AnnualLightRecord> findByMemberIdAndLightTypeIdAndYear(Long memberId, Long lightTypeId, int year);

    List<AnnualLightRecord> findByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByMemberIdAndYearAndActiveTrue(Long memberId, int year);

    /** 列印與戶一覽只看在籍成員；已刪除成員的紀錄留著是為了復原，不該印出來。 */
    List<AnnualLightRecord> findByYearAndActiveTrueAndMemberDeletedAtIsNull(int year);

    long countByHouseholdIdAndYearAndActiveTrueAndMemberDeletedAtIsNull(Long householdId, int year);

    List<AnnualLightRecord> findByYearAndMemberIdInAndActiveTrue(int year, Collection<Long> memberIds);

    List<AnnualLightRecord> findByYearAndHouseholdIdInAndActiveTrueAndMemberDeletedAtIsNull(int year, Collection<Long> householdIds);

    /**
     * 批次更新不經過 @Version，標記印卡才不會讓櫃台同時開著的單撞上樂觀鎖。
     * 要 last_order_item_id 也對得上才標：印卡頁開著時燈被取消又重點，那是新卡，不能被舊頁面標掉。
     * 用陣列參數而不是 IN 清單，整年幾千張也不會碰到 bind 參數上限。
     */
    @Modifying
    @Query(value = """
        update annual_light_records r set card_printed_at = :at
        from unnest(cast(:ids as bigint[]), cast(:itemIds as bigint[])) as t(id, item_id)
        where r.id = t.id and r.last_order_item_id = t.item_id and r.is_active""", nativeQuery = true)
    int markCardPrinted(Long[] ids, Long[] itemIds, OffsetDateTime at);

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
    Page<Member> pageLitMembers(@Param("year") int year, Pageable pageable);

    @Query(value = """
        select h from Household h
        where exists (select r.id from AnnualLightRecord r
                      where r.household = h and r.year = :year and r.active = true and r.member.deletedAt is null)
        order by h.householdNumber
        """, countQuery = """
        select count(h) from Household h
        where exists (select r.id from AnnualLightRecord r
                      where r.household = h and r.year = :year and r.active = true and r.member.deletedAt is null)
        """)
    Page<Household> pageLitHouseholds(@Param("year") int year, Pageable pageable);
}
