package tw.temple.admin.closing;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.closing.ClosingDtos.ClosingView;
import tw.temple.admin.closing.ClosingDtos.DaySummary;
import tw.temple.admin.closing.ClosingDtos.PaymentRow;
import tw.temple.admin.common.ApiException;
import tw.temple.admin.config.TempleClock;
import tw.temple.admin.household.Member;
import tw.temple.admin.household.MemberRepository;
import tw.temple.admin.order.Payment;
import tw.temple.admin.order.PaymentKind;
import tw.temple.admin.order.PaymentRepository;
import tw.temple.admin.user.User;

@Service
@Transactional
public class ClosingService {

    private final DailyClosingRepository closings;
    private final PaymentRepository payments;
    private final MemberRepository members;
    private final TempleClock clock;

    public ClosingService(DailyClosingRepository closings, PaymentRepository payments, MemberRepository members, TempleClock clock) {
        this.closings = closings;
        this.payments = payments;
        this.members = members;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DaySummary summary(LocalDate dateOrNull) {
        LocalDate date = dateOrNull == null ? clock.today() : dateOrNull;
        List<PaymentRow> rows = payments.findByPostedOnOrderByIdAsc(date).stream().map(this::toRow).toList();
        int systemCash = payments.sumByKindAndPostedOn(PaymentKind.CASH, date);
        Optional<LocalDate> through = closedThrough();
        boolean closed = through.map(t -> !date.isAfter(t)).orElse(false);
        return new DaySummary(date, systemCash, closed, through.orElse(null), rows);
    }

    public DailyClosing close(LocalDate dateOrNull, int countedCash, String note, User actor) {
        LocalDate today = clock.today();
        LocalDate date = dateOrNull == null ? today : dateOrNull;
        if (date.isAfter(today)) {
            throw ApiException.badRequest("不能日結未來的日期");
        }
        Optional<LocalDate> through = closedThrough();
        if (through.isPresent() && !date.isAfter(through.get())) {
            throw ApiException.conflict("該日已日結");
        }
        int systemCash = payments.sumByKindAndPostedOn(PaymentKind.CASH, date);
        DailyClosing saved = closings.saveAndFlush(new DailyClosing(date, systemCash, countedCash, actor,
            note == null || note.isBlank() ? null : note.trim()));
        return closings.findById(saved.getClosingDate()).orElse(saved);
    }

    @Transactional(readOnly = true)
    public List<ClosingView> history() {
        return closings.findAllByOrderByClosingDateDesc().stream().map(ClosingView::of).toList();
    }

    @Transactional(readOnly = true)
    public Optional<LocalDate> closedThrough() {
        return closings.findTopByOrderByClosingDateDesc().map(DailyClosing::getClosingDate);
    }

    private PaymentRow toRow(Payment p) {
        Long householdId = p.getOrder().getHousehold().getId();
        String headName = members.findFirstByHouseholdIdAndHeadTrueAndDeletedAtIsNull(householdId).map(Member::getName).orElse(null);
        return new PaymentRow(p.getId(), p.getCreatedAt(), p.getOrder().getId(), p.getOrder().getKind(),
            p.getOrder().getHousehold().getHouseholdNumber(), headName, p.getKind(), p.getAmount(), p.getReceivedOn(),
            p.getReceivedBy() == null ? null : p.getReceivedBy().getDisplayName(), p.getNote());
    }
}
