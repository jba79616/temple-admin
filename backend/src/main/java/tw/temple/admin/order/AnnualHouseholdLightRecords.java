package tw.temple.admin.order;

import java.util.List;
import org.springframework.stereotype.Component;
import tw.temple.admin.household.Household;
import tw.temple.admin.household.HouseholdDtos.RecordView;
import tw.temple.admin.household.HouseholdLightRecords;

@Component
class AnnualHouseholdLightRecords implements HouseholdLightRecords {

    private final AnnualLightRecordRepository records;

    AnnualHouseholdLightRecords(AnnualLightRecordRepository records) {
        this.records = records;
    }

    @Override
    public long countActive(Long householdId, int year) {
        return records.countByHouseholdIdAndYearAndActiveTrueAndMemberDeletedAtIsNull(householdId, year);
    }

    @Override
    public List<RecordView> activeRecords(Long householdId, int year) {
        return records.findByHouseholdIdAndYearAndActiveTrue(householdId, year).stream()
            .map(r -> new RecordView(r.getMember().getId(), r.getLightType().getId(), r.getUnitPrice()))
            .toList();
    }

    @Override
    public void moveActiveRecordsOfMember(Long memberId, int year, Household target) {
        for (AnnualLightRecord record : records.findByMemberIdAndYearAndActiveTrue(memberId, year)) {
            record.moveTo(target);
            records.save(record);
        }
    }
}
