package tw.temple.admin.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record ItemInput(@NotNull Long memberId, @NotNull Long lightTypeId, @NotNull ItemAction action, Integer unitPrice,
                            @Size(max = 100) String overrideReason) {
    }

    public record CreateOrderRequest(Integer year, @NotNull Long householdId, LocalDate registeredOn, LocalDate receivedOn,
                                     @Size(max = 200) String note, @NotEmpty List<@Valid ItemInput> items) {
    }

    public record CreateCorrectionRequest(Integer year, Long householdId, LocalDate registeredOn, LocalDate receivedOn,
                                          @NotBlank @Size(max = 200) String reason, @NotNull Settlement settlement,
                                          @NotEmpty List<@Valid ItemInput> items) {
    }

    public record VoidRequest(@NotBlank @Size(max = 200) String reason) {
    }

    public record ItemView(Long id, Long memberId, String memberName, Long lightTypeId, String lightTypeName, ItemAction action,
                           int unitPrice, String overrideReason, OffsetDateTime createdAt) {
    }

    public record PaymentView(Long id, PaymentKind kind, int amount, LocalDate receivedOn, LocalDate postedOn, String receivedBy,
                              String note, OffsetDateTime createdAt) {
    }

    public record OrderView(Long id, OrderKind kind, OrderStatus status, int year, Long householdId, Integer householdNumber,
                            String headName, LocalDate registeredOn, LocalDate postedOn, int totalDue, int paid, int balance,
                            Long correctsOrderId, List<Long> correctedByOrderIds, String note, String createdBy,
                            OffsetDateTime createdAt, String voidedBy, OffsetDateTime voidedAt, String voidReason, boolean closed,
                            List<ItemView> items, List<PaymentView> payments) {
    }
}
