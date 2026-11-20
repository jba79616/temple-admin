package tw.temple.admin.mailing;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
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
import tw.temple.admin.mailing.MailingImportService.Report;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class MailingImportController {

    private static final Charset BIG5 = Charset.forName("MS950");

    private final MailingImportService service;
    private final CurrentUser currentUser;

    public MailingImportController(MailingImportService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping(value = "/mailing-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Report run(@RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "false") boolean commit) {
        return service.run(decode(file), currentUser.get(), commit);
    }

    /** Excel 直接「另存 CSV」是 Big5，「CSV UTF-8」才是 UTF-8；先試 UTF-8，解不開再當 Big5。 */
    private String decode(MultipartFile file) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("請選擇 CSV 檔");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("讀取檔案失敗：" + e.getMessage());
        }
        try {
            return decode(bytes, StandardCharsets.UTF_8);
        } catch (CharacterCodingException utf8) {
            try {
                return decode(bytes, BIG5);
            } catch (CharacterCodingException big5) {
                throw ApiException.badRequest("檔案不是 UTF-8 也不是 Big5 編碼，請在 Excel 用「CSV UTF-8」另存");
            }
        }
    }

    private String decode(byte[] bytes, Charset charset) throws CharacterCodingException {
        return charset.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(bytes))
            .toString();
    }
}
