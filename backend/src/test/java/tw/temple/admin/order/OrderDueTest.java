package tw.temple.admin.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import tw.temple.admin.common.ApiException;

class OrderDueTest {

    @Test
    void keepsDueThatBothItAndItsNegationFitInAnInt() {
        assertThat(OrderService.toIntDue(Integer.MAX_VALUE)).isEqualTo(Integer.MAX_VALUE);
        assertThat(OrderService.toIntDue(-Integer.MAX_VALUE)).isEqualTo(-Integer.MAX_VALUE);
        assertThat(OrderService.toIntDue(0)).isZero();
    }

    @Test
    void rejectsDueWhoseNegationWouldOverflow() {
        assertThatThrownBy(() -> OrderService.toIntDue(Integer.MIN_VALUE)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> OrderService.toIntDue(Integer.MAX_VALUE + 1L)).isInstanceOf(ApiException.class);
    }
}
