package tw.temple.admin.order;

import java.time.LocalDate;

/** 由日結模組實作；單據只需要知道某天是否已日結，不必依賴整個日結模組。 */
public interface DayClosingStatus {

    boolean isClosed(LocalDate date);
}
