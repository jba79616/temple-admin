package tw.temple.admin.order;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnualLightRecordRepository extends JpaRepository<AnnualLightRecord, Long> {

    Optional<AnnualLightRecord> findByMemberIdAndLightTypeIdAndYear(Long memberId, Long lightTypeId, int year);

    List<AnnualLightRecord> findByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByMemberIdAndYearAndActiveTrue(Long memberId, int year);

    /** 列印與戶一覽只看在籍成員；已刪除成員的紀錄留著是為了復原，不該印出來。 */
    List<AnnualLightRecord> findByYearAndActiveTrueAndMemberDeletedAtIsNull(int year);

    long countByHouseholdIdAndYearAndActiveTrueAndMemberDeletedAtIsNull(Long householdId, int year);

    List<AnnualLightRecord> findByYearAndMemberIdInAndActiveTrue(int year, Collection<Long> memberIds);

    List<AnnualLightRecord> findByYearAndHouseholdIdInAndActiveTrueAndMemberDeletedAtIsNull(int year, Collection<Long> householdIds);
}
