package tw.temple.admin.common;

public final class Amounts {

    /** 單筆金額（單價、燈種價格）的業務上限，前端 MAX_AMOUNT 用同一個數字；日結實點是累計金額，不套這個上限。 */
    public static final int MAX = 1_000_000;

    private Amounts() {
    }
}
