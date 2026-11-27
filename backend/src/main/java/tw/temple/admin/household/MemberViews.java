package tw.temple.admin.household;

import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.calendar.Ganzhi;
import tw.temple.admin.calendar.Taisui;
import tw.temple.admin.household.HouseholdDtos.MemberView;
import tw.temple.admin.systemconfig.ConfigService;

@Component
public class MemberViews {

    private final ConfigService config;

    public MemberViews(ConfigService config) {
        this.config = config;
    }

    @Transactional(readOnly = true)
    public Map<Character, String> taisuiMap(int year) {
        return Taisui.relationsFor(Ganzhi.branchOfYear(year), config.taisuiRelations());
    }

    public MemberView toView(Member m, Map<Character, String> taisui) {
        String branch = m.getBirthBranch();
        if (branch == null && Ganzhi.isValid(m.getBirthGanzhi())) {
            branch = String.valueOf(m.getBirthGanzhi().charAt(1));
        }
        String zodiac = branch == null ? null : Ganzhi.zodiac(branch.charAt(0));
        String relation = branch == null ? null : taisui.get(branch.charAt(0));
        return new MemberView(m.getId(), m.getHousehold().getId(), m.getName(), m.getGender(), m.isHead(), m.getSortOrder(),
            m.getCity(), m.getDistrict(), m.getAddress(), m.getPhone(), m.getBirthGanzhi(), branch,
            m.getBirthMonth() == null ? null : m.getBirthMonth().intValue(), m.isBirthMonthIsLeap(),
            m.getBirthDay() == null ? null : m.getBirthDay().intValue(), m.getBirthHourBranch(), zodiac, relation,
            m.birthText(), m.isDeleted());
    }
}
