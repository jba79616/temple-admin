package tw.temple.admin.legacy;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.legacy.LegacyImportService.Report;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class LegacyImportController {

    private final LegacyImportService service;
    private final CurrentUser currentUser;

    public LegacyImportController(LegacyImportService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping(value = "/legacy-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Report run(@RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "false") boolean commit) {
        return service.run(decode(file), currentUser.get(), commit);
    }

    private static String decode(MultipartFile file) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("請選擇 SQL dump 檔");
        }
        try {
            return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(file.getBytes()))
                .toString();
        } catch (CharacterCodingException e) {
            throw ApiException.badRequest("檔案不是 UTF-8 編碼，請用 mysqldump --default-character-set=utf8mb4 重新匯出");
        } catch (IOException e) {
            throw ApiException.badRequest("讀取檔案失敗：" + e.getMessage());
        }
    }
}
