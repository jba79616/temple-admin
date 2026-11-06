package tw.temple.admin.household;

public record MemberFields(String name, String gender, String city, String district, String address, String phone,
                           String birthGanzhi, Integer birthMonth, boolean birthMonthIsLeap, Integer birthDay,
                           String birthHourBranch, Integer sortOrder) {
}
