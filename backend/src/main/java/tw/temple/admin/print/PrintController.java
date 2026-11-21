package tw.temple.admin.print;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.light.LightCategory;
import tw.temple.admin.print.PrintService.ApplicationForm;
import tw.temple.admin.print.PrintService.Cards;
import tw.temple.admin.print.PrintService.FormScope;
import tw.temple.admin.print.PrintService.NameList;

@RestController
@RequestMapping("/api/print")
public class PrintController {

    private final PrintService service;
    private final PdfService pdfService;

    public PrintController(PrintService service, PdfService pdfService) {
        this.service = service;
        this.pdfService = pdfService;
    }

    @GetMapping("/name-list")
    public NameList nameList(@RequestParam(required = false) Integer year, @RequestParam(required = false) Long lightTypeId,
                             @RequestParam(required = false) LightCategory category) {
        return service.nameList(year, lightTypeId, category);
    }

    @GetMapping("/cards")
    public Cards cards(@RequestParam(required = false) Integer year, @RequestParam(required = false) Long lightTypeId,
                       @RequestParam(required = false) LightCategory category, @RequestParam(required = false) Long orderId) {
        if (orderId != null) {
            return service.cardsByOrder(orderId);
        }
        return service.cardsByYear(year, lightTypeId, category);
    }

    @GetMapping("/application-form")
    public ApplicationForm applicationForm(@RequestParam(defaultValue = "LIT") FormScope scope,
                                           @RequestParam(required = false) Integer year) {
        return service.applicationForm(scope, year);
    }

    /** 把前端的列印頁（/print/...）在伺服器上轉成 PDF；帶著呼叫者的 session cookie 去開，所以同樣要登入。 */
    @GetMapping("/pdf")
    public ResponseEntity<byte[]> pdf(@RequestParam String path, HttpServletRequest request) {
        Map<String, String> cookies = new LinkedHashMap<>();
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                cookies.put(c.getName(), c.getValue());
            }
        }
        PdfService.Pdf pdf = pdfService.render(path, cookies);
        String filename = (pdf.title().isBlank() ? "print" : pdf.title()) + ".pdf";
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
            .body(pdf.bytes());
    }
}
