package tw.temple.admin.print;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.print.PrintService.Cards;
import tw.temple.admin.print.PrintService.NameList;

@RestController
@RequestMapping("/api/print")
public class PrintController {

    private final PrintService service;

    public PrintController(PrintService service) {
        this.service = service;
    }

    @GetMapping("/name-list")
    public NameList nameList(@RequestParam(required = false) Integer year, @RequestParam Long lightTypeId,
                             @RequestParam(defaultValue = "false") boolean all) {
        return service.nameList(year, lightTypeId, all);
    }

    @GetMapping("/cards")
    public Cards cards(@RequestParam(required = false) Integer year, @RequestParam(required = false) Long lightTypeId,
                       @RequestParam(required = false) Long orderId) {
        if (orderId != null) {
            return service.cardsByOrder(orderId);
        }
        if (lightTypeId == null) {
            throw ApiException.badRequest("請指定燈種或單號");
        }
        return service.cardsByYear(year, lightTypeId);
    }
}
