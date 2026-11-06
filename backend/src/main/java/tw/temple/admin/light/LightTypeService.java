package tw.temple.admin.light;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.audit.AuditService;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.user.User;

@Service
@Transactional
public class LightTypeService {

    private final LightTypeRepository repo;
    private final AuditService audit;

    public LightTypeService(LightTypeRepository repo, AuditService audit) {
        this.repo = repo;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<LightType> all() {
        return repo.findAllByOrderBySortOrderAscIdAsc();
    }

    @Transactional(readOnly = true)
    public List<LightType> active() {
        return repo.findByActiveTrueOrderBySortOrderAscIdAsc();
    }

    @Transactional(readOnly = true)
    public LightType get(Long id) {
        return repo.findById(id).orElseThrow(() -> ApiException.notFound("找不到燈種"));
    }

    public LightType create(LightTypeFields fields, User actor) {
        validate(fields, null);
        LightType saved = repo.save(new LightType(fields));
        audit.record("light_types", saved.getId(), "INSERT", null, saved.snapshot(), actor);
        return saved;
    }

    public LightType update(Long id, LightTypeFields fields, User actor) {
        LightType type = get(id);
        validate(fields, id);
        var before = type.snapshot();
        type.update(fields);
        LightType saved = repo.save(type);
        audit.record("light_types", saved.getId(), "UPDATE", before, saved.snapshot(), actor);
        return saved;
    }

    private void validate(LightTypeFields fields, Long selfId) {
        if (fields.price() < 0) {
            throw ApiException.badRequest("價格不可為負");
        }
        repo.findByName(fields.name()).ifPresent(existing -> {
            if (!existing.getId().equals(selfId)) {
                throw ApiException.conflict("燈種名稱已存在");
            }
        });
        if (fields.taisui()) {
            boolean another = repo.findAll().stream().anyMatch(t -> t.isTaisui() && !t.getId().equals(selfId));
            if (another) {
                throw ApiException.conflict("只能有一種燈標記為太歲燈");
            }
        }
    }
}
