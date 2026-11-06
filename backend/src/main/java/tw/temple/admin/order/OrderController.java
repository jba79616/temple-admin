package tw.temple.admin.order;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tw.temple.admin.order.OrderDtos.CreateCorrectionRequest;
import tw.temple.admin.order.OrderDtos.CreateOrderRequest;
import tw.temple.admin.order.OrderDtos.OrderView;
import tw.temple.admin.order.OrderDtos.VoidRequest;
import tw.temple.admin.user.CurrentUser;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;
    private final CurrentUser currentUser;

    public OrderController(OrderService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<OrderView> list(@RequestParam(required = false) Long householdId,
                                @RequestParam(defaultValue = "false") boolean unsettled) {
        if (unsettled) {
            return service.unsettled();
        }
        if (householdId == null) {
            return List.of();
        }
        return service.byHousehold(householdId);
    }

    @GetMapping("/{id}")
    public OrderView get(@PathVariable Long id) {
        return service.view(id);
    }

    @PostMapping
    public OrderView create(@Valid @RequestBody CreateOrderRequest req) {
        return service.view(service.createCounter(req, currentUser.get()).getId());
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasRole('ADMIN')")
    public OrderView voidOrder(@PathVariable Long id, @Valid @RequestBody VoidRequest req) {
        return service.view(service.voidOrder(id, req.reason(), currentUser.get()).getId());
    }

    @PostMapping("/{id}/corrections")
    @PreAuthorize("hasRole('ADMIN')")
    public OrderView correct(@PathVariable Long id, @Valid @RequestBody CreateCorrectionRequest req) {
        return service.view(service.correctOrder(id, req, currentUser.get()).getId());
    }
}
