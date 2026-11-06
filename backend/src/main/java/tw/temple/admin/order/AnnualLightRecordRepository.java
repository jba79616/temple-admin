package tw.temple.admin.order;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnualLightRecordRepository extends JpaRepository<AnnualLightRecord, Long> {

    Optional<AnnualLightRecord> findByMemberIdAndLightTypeIdAndYear(Long memberId, Long lightTypeId, int year);

    List<AnnualLightRecord> findByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByMemberIdAndYearAndActiveTrue(Long memberId, int year);

    List<AnnualLightRecord> findByYearAndLightTypeIdAndActiveTrue(int year, Long lightTypeId);

    long countByHouseholdIdAndYearAndActiveTrue(Long householdId, int year);

    List<AnnualLightRecord> findByLastOrderItemOrderIdOrderByIdAsc(Long orderId);
}
