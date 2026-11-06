package tw.temple.admin.systemconfig;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.calendar.Taisui;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.user.User;

@Service
@Transactional
public class ConfigService {

    public static final String CURRENT_YEAR = "current_year";
    public static final String TEMPLE_NAME = "temple_name";
    public static final String TEMPLE_ADDRESS = "temple_address";
    public static final String TAISUI_RELATIONS = "taisui_relations";
    public static final String PRAYER_MONTH = "prayer_month";

    private final SystemConfigRepository repo;
    private final AuditService audit;

    public ConfigService(SystemConfigRepository repo, AuditService audit) {
        this.repo = repo;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<SystemConfig> all() {
        return repo.findAllByOrderByKeyAsc();
    }

    @Transactional(readOnly = true)
    public String get(String key) {
        return repo.findById(key).map(SystemConfig::getValue).orElseThrow(() -> ApiException.notFound("沒有設定 " + key));
    }

    @Transactional(readOnly = true)
    public int currentYear() {
        return Integer.parseInt(get(CURRENT_YEAR).trim());
    }

    @Transactional(readOnly = true)
    public Set<String> taisuiRelations() {
        String raw = repo.findById(TAISUI_RELATIONS).map(SystemConfig::getValue).orElse("");
        Set<String> enabled = new LinkedHashSet<>();
        Arrays.stream(raw.split("[,，\\s]+")).map(String::trim).filter(Taisui.ALL_RELATIONS::contains).forEach(enabled::add);
        return enabled;
    }

    public SystemConfig update(String key, String value, User actor) {
        SystemConfig config = repo.findById(key).orElseThrow(() -> ApiException.notFound("沒有設定 " + key));
        validate(key, value);
        Map<String, Object> before = Map.of("key", key, "value", config.getValue());
        config.update(value.trim(), actor.getId());
        SystemConfig saved = repo.save(config);
        audit.record("system_configs", 0L, "UPDATE", before, Map.of("key", key, "value", saved.getValue()), actor);
        return saved;
    }

    private void validate(String key, String value) {
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("設定值不可空白");
        }
        if (CURRENT_YEAR.equals(key)) {
            int year;
            try {
                year = Integer.parseInt(value.trim());
            } catch (NumberFormatException ex) {
                throw ApiException.badRequest("年度必須是西元年數字");
            }
            if (year < 1990 || year > 2100) {
                throw ApiException.badRequest("年度必須是 1990 到 2100 之間的西元年");
            }
        }
        if (TAISUI_RELATIONS.equals(key)) {
            for (String part : value.split("[,，\\s]+")) {
                if (!part.isBlank() && !Taisui.ALL_RELATIONS.contains(part.trim())) {
                    throw ApiException.badRequest("太歲關係只能是 值、沖、刑、害、破");
                }
            }
        }
    }
}
