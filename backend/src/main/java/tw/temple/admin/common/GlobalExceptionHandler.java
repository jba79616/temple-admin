package tw.temple.admin.common;

import java.sql.SQLException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.UncategorizedDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String UNIQUE_VIOLATION = "23505";
    private static final String FOREIGN_KEY_VIOLATION = "23503";
    private static final String CHECK_VIOLATION = "23514";
    /** forbid_change() trigger 的 RAISE EXCEPTION；Hibernate 不把它當 constraint violation，所以走 uncategorized 那條。 */
    private static final String RAISED_BY_TRIGGER = "P0001";

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, String>> apiException(ApiException ex) {
        return ResponseEntity.status(ex.status()).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException ex) {
        FieldError error = ex.getBindingResult().getFieldError();
        String message = error == null ? "資料格式錯誤" : error.getField() + " " + error.getDefaultMessage();
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, String>> denied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "權限不足"));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<Map<String, String>> staleUpdate(OptimisticLockingFailureException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "這筆資料剛被別人改過，請重新整理後再操作"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> integrity(DataIntegrityViolationException ex) {
        String sqlState = sqlState(ex);
        log.warn("資料庫拒絕寫入 sqlState={} : {}", sqlState, ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", integrityMessage(sqlState)));
    }

    @ExceptionHandler({UncategorizedDataAccessException.class, TransactionSystemException.class})
    ResponseEntity<Map<String, String>> databaseFailure(RuntimeException ex) {
        if (RAISED_BY_TRIGGER.equals(sqlState(ex))) {
            log.warn("資料庫 trigger 拒絕寫入：{}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "單據明細與收款只能新增、不能修改或刪除；要更正請作廢或開更正單"));
        }
        log.error("資料庫操作失敗", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "系統發生錯誤，請稍後再試"));
    }

    private String integrityMessage(String sqlState) {
        if (sqlState == null) {
            return "資料違反限制，沒有寫入";
        }
        return switch (sqlState) {
            case UNIQUE_VIOLATION -> "已有相同的資料，不能重複建立";
            case FOREIGN_KEY_VIOLATION -> "資料仍被其他紀錄引用，不能刪除或修改";
            case CHECK_VIOLATION -> "資料不符合欄位限制，沒有寫入";
            default -> "資料違反限制，沒有寫入";
        };
    }

    private String sqlState(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql && sql.getSQLState() != null) {
                return sql.getSQLState();
            }
        }
        return null;
    }
}
