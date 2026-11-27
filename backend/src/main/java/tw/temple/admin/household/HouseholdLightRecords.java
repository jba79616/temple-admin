package tw.temple.admin.household;

import java.util.List;
import tw.temple.admin.household.HouseholdDtos.RecordView;

/** 年度安燈狀態屬於單據模組，由它實作；戶與成員只透過這個介面讀取與搬移。 */
public interface HouseholdLightRecords {

    long countActive(Long householdId, int year);

    List<RecordView> activeRecords(Long householdId, int year);

    void moveActiveRecordsOfMember(Long memberId, int year, Household target);
}
