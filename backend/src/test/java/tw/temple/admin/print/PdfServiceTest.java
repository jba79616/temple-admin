package tw.temple.admin.print;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tw.temple.admin.common.ApiException;

class PdfServiceTest {

    private final PdfService sut = new PdfService(List.of());

    @ParameterizedTest
    @ValueSource(strings = {
        "/print/cards/../../login",
        "/print/%2e%2e/login",
        "/print/cards?x=1#/login",
        "/print/other?year=2026",
        "/households/1",
        "//evil",
        "/print/cards?year=2026&q=a b",
    })
    void rejectsPathsOutsideThePrintRoutes(String path) {
        assertThatThrownBy(() -> sut.render(path, Map.of()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("列印頁面");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/print/cards?year=2026&lightTypeId=3", "/print/name-list?year=2026&category=BAGUA&all=true",
        "/print/application-form?scope=LIT&year=2025", "/print/cards", "/print/labels"})
    void acceptsPrintRoutesButRefusesBeforeTheServerIsReady(String path) {
        assertThatThrownBy(() -> sut.render(path, Map.of()))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("尚未就緒");
    }
}
