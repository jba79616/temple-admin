package tw.temple.admin.household;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class HouseholdDtos {

    private HouseholdDtos() {
    }

    public record MemberInput(@NotBlank @Size(max = 50) String name, String gender, @Size(max = 10) String city,
                              @Size(max = 10) String district, @Size(max = 200) String address, @Size(max = 20) String phone,
                              String birthGanzhi, Integer birthMonth, Boolean birthMonthIsLeap, Integer birthDay,
                              String birthHourBranch, Integer sortOrder) {

        public MemberFields toFields() {
            return new MemberFields(name.trim(), blankToNull(gender), blankToNull(city), blankToNull(district),
                blankToNull(address), blankToNull(phone), blankToNull(birthGanzhi), birthMonth,
                Boolean.TRUE.equals(birthMonthIsLeap), birthDay, blankToNull(birthHourBranch), sortOrder);
        }
    }

    public record HouseholdInput(@Size(max = 10) String city, @Size(max = 10) String district, @Size(max = 200) String address,
                                 @Size(max = 20) String phone, @Size(max = 100) String contactNote, String notes,
                                 @Valid MemberInput head) {

        public HouseholdFields toFields() {
            return new HouseholdFields(blankToNull(city), blankToNull(district), blankToNull(address), blankToNull(phone),
                blankToNull(contactNote), blankToNull(notes));
        }
    }

    public record HouseholdSummary(Long id, Integer householdNumber, String headName, String cityDistrict, int memberCount,
                                   long lanternCount, String phone) {
    }

    public record MemberView(Long id, Long householdId, String name, String gender, boolean head, int sortOrder, String city,
                             String district, String address, String phone, String birthGanzhi, String birthBranch,
                             Integer birthMonth, boolean birthMonthIsLeap, Integer birthDay, String birthHourBranch,
                             String zodiac, String taisui, String birthText, boolean deleted) {
    }

    public record RecordView(Long memberId, Long lightTypeId, int unitPrice) {
    }

    public record HouseholdDetail(Long id, Integer householdNumber, String city, String district, String address, String phone,
                                  String contactNote, String notes, int year, List<MemberView> members, List<RecordView> records) {
    }

    public record DeleteMemberRequest(@NotBlank @Size(max = 100) String reason, Long newHeadId) {
    }

    public record MoveMemberRequest(@NotNull Long householdId) {
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
