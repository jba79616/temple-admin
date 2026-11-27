package tw.temple.admin.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.transaction.TransactionSystemException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.InvalidFormatException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler sut = new GlobalExceptionHandler();

    @Test
    void appendOnlyTriggerBecomesConflictWithExplanation() {
        var ex = new UncategorizedSQLException("update", "update payments set amount = 1",
            new SQLException("payments is append-only", "P0001"));

        var response = sut.databaseFailure(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "單據明細與收款只能新增、不能修改或刪除；要更正請作廢或開更正單");
    }

    @Test
    void triggerRaisedAtCommitIsFoundDownTheCauseChain() {
        var ex = new TransactionSystemException("commit failed",
            new RuntimeException("rollback", new SQLException("light_order_items is append-only", "P0001")));

        assertThat(sut.databaseFailure(ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void otherDatabaseFailuresAreServerErrorsWithoutLeakingDetails() {
        var ex = new UncategorizedSQLException("select", "select 1", new SQLException("boom", "XX000"));

        var response = sut.databaseFailure(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().get("message")).doesNotContain("boom");
    }

    @Test
    void uniqueViolationIsExplainedAsDuplicate() {
        var ex = new DataIntegrityViolationException("insert", new SQLException("duplicate key", "23505"));

        var response = sut.integrity(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "已有相同的資料，不能重複建立");
    }

    @Test
    void unreadableBodyNamesTheFieldPathAndSkipsReferencesWithoutNameOrIndex() {
        JacksonException cause = InvalidFormatException.from(null, "out of range", "2147483648", Integer.class);
        cause.prependPath(new JacksonException.Reference(null, "unitPrice"));
        cause.prependPath(new JacksonException.Reference(new Object()));
        cause.prependPath(new JacksonException.Reference(null, 0));
        cause.prependPath(new JacksonException.Reference(null, "items"));

        var response = sut.unreadable(new HttpMessageNotReadableException("bad", cause, new MockHttpInputMessage(new byte[0])));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("message", "items[0].unitPrice 格式錯誤或超出範圍");
    }
}
