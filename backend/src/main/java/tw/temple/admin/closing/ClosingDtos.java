package tw.temple.admin.closing;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import tw.temple.admin.order.OrderKind;
import tw.temple.admin.order.PaymentKind;

public final class ClosingDtos {

    private ClosingDtos() {
    }

    public record PaymentRow(Long id, OffsetDateTime createdAt, Long orderId, OrderKind orderKind, Integer householdNumber,
                             String headName, PaymentKind kind, int amount, LocalDate receivedOn, String receivedBy, String note) {
    }

    public record DaySummary(LocalDate date, int systemCash, boolean closed, LocalDate closedThrough, List<PaymentRow> payments) {
    }

    public record CloseRequest(LocalDate closingDate, @NotNull Integer countedCash, @Size(max = 200) String note) {
    }

    public record ClosingView(LocalDate closingDate, int systemCash, int countedCash, int difference, String closedBy,
                              OffsetDateTime closedAt, String note) {
        static ClosingView of(DailyClosing c) {
            return new ClosingView(c.getClosingDate(), c.getSystemCash(), c.getCountedCash(), c.getDifference(),
                c.getClosedBy().getDisplayName(), c.getClosedAt(), c.getNote());
        }
    }
}
