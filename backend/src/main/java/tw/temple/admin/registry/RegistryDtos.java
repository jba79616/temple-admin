package tw.temple.admin.registry;

import java.util.List;

public final class RegistryDtos {

    private RegistryDtos() {
    }

    public record PageView<T>(List<T> items, int page, int size, long total, int totalPages) {
    }

    public record MemberRow(Long id, Long householdId, Integer householdNumber, String name, String gender, boolean head,
                            String birthText, String zodiac, String taisui, String cityDistrict, String address, String phone,
                            List<String> lanterns) {
    }

    public record HouseholdRow(Long id, Integer householdNumber, Long headId, String headName, String headBirthText,
                               String headZodiac, String headTaisui, String cityDistrict, String address, String phone,
                               int memberCount, long lanternCount, List<MemberRow> members) {
    }
}
