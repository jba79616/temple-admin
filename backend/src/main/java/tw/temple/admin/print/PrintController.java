package tw.temple.admin.print;

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

    public PrintController(PrintService service) {
        this.service = service;
    }

    @GetMapping("/name-list")
    public NameList nameList(@RequestParam(required = false) Integer year, @RequestParam(required = false) Long lightTypeId,
                             @RequestParam(required = false) LightCategory category, @RequestParam(defaultValue = "false") boolean all) {
        return service.nameList(year, lightTypeId, category, all);
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
}
