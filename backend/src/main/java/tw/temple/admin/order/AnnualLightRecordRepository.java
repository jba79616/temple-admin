package tw.temple.admin.order;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnualLightRecordRepository extends JpaRepository<AnnualLightRecord, Long> {

    Optional<AnnualLightRecord> findByMemberIdAndLightTypeIdAndYear(Long memberId, Long lightTypeId, int year);

    List<AnnualLightRecord> findByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByMemberIdAndYearAndActiveTrue(Long memberId, int year);

    List<AnnualLightRecord> findByYearAndActiveTrue(int year);

    long countByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByYearAndMemberIdInAndActiveTrue(int year, Collection<Long> memberIds);

    List<AnnualLightRecord> findByYearAndHouseholdIdInAndActiveTrue(int year, Collection<Long> householdIds);
}
