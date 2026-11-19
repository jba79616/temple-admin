package tw.temple.admin.closing;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.temple.admin.closing.ClosingDtos.ClosingView;
import tw.temple.admin.closing.ClosingDtos.DayStatus;
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
        LocalDate after = closings.findTopByClosingDateLessThanOrderByClosingDateDesc(date).map(DailyClosing::getClosingDate).orElse(null);
        List<Payment> posted = payments.findPostedBetweenExcludingImport(after, date);
        Map<Long, String> headNames = headNames(posted);
        List<PaymentRow> rows = posted.stream().map(p -> toRow(p, headNames)).toList();
        int systemCash = payments.sumByKindPostedBetween(PaymentKind.CASH, after, date);
        Optional<LocalDate> through = closedThrough();
        return new DaySummary(date, after == null ? null : after.plusDays(1), systemCash, isClosed(date), through.orElse(null), rows);
    }

    @Transactional(readOnly = true)
    public DayStatus status() {
        LocalDate today = clock.today();
        Optional<LocalDate> through = closedThrough();
        LocalDate after = closings.findTopByClosingDateLessThanOrderByClosingDateDesc(today).map(DailyClosing::getClosingDate).orElse(null);
        int count = (int) payments.countPostedBetweenExcludingImport(after, today);
        int systemCash = payments.sumByKindPostedBetween(PaymentKind.CASH, after, today);
        boolean closed = through.map(t -> !today.isAfter(t)).orElse(false);
        return new DayStatus(today, closed, through.orElse(null), count, systemCash);
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
        int systemCash = payments.sumByKindPostedBetween(PaymentKind.CASH, through.orElse(null), date);
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

    @Transactional(readOnly = true)
    public boolean isClosed(LocalDate date) {
        return closedThrough().map(through -> !date.isAfter(through)).orElse(false);
    }

    private Map<Long, String> headNames(List<Payment> posted) {
        List<Long> householdIds = posted.stream().map(p -> p.getOrder().getHousehold().getId()).distinct().toList();
        if (householdIds.isEmpty()) {
            return Map.of();
        }
        return members.findByHouseholdIdInAndDeletedAtIsNullOrderBySortOrderAscIdAsc(householdIds).stream()
            .filter(Member::isHead)
            .collect(Collectors.toMap(m -> m.getHousehold().getId(), Member::getName, (first, second) -> first));
    }

    private PaymentRow toRow(Payment p, Map<Long, String> headNames) {
        return new PaymentRow(p.getId(), p.getCreatedAt(), p.getOrder().getId(), p.getOrder().getKind(),
            p.getOrder().getHousehold().getHouseholdNumber(), headNames.get(p.getOrder().getHousehold().getId()), p.getKind(),
            p.getAmount(), p.getReceivedOn(), p.getReceivedBy() == null ? null : p.getReceivedBy().getDisplayName(), p.getNote());
    }
}
