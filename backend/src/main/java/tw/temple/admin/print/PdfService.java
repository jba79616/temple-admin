package tw.temple.admin.print;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import com.microsoft.playwright.TimeoutError;
import com.microsoft.playwright.options.Cookie;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.server.context.WebServerInitializedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tw.temple.admin.common.ApiException;

/**
 * 用機器上裝好的 Chrome / Edge 把 /print/ 頁面轉成 PDF，版面跟瀏覽器列印完全一樣。
 * Playwright 物件不是 thread-safe，所有操作都排在同一把鎖後面；瀏覽器第一次用到才啟動，之後重用。
 */
@Service
public class PdfService implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(PdfService.class);
    private static final double PAGE_TIMEOUT_MS = 30_000;
    private static final Set<String> PRINT_ROUTES = Set.of("/print/cards", "/print/name-list", "/print/application-form", "/print/labels",
        "/print/wenshu");
    private static final Pattern QUERY = Pattern.compile("[\\w&=%.-]*");

    public record Pdf(byte[] bytes, String title) {
    }

    private final List<String> channels;
    private final Object lock = new Object();
    private Playwright playwright;
    private Browser browser;
    private volatile int port;

    public PdfService(@Value("${temple.pdf.channels:chrome,msedge}") List<String> channels) {
        this.channels = List.copyOf(channels);
    }

    @EventListener
    void onWebServerReady(WebServerInitializedEvent event) {
        port = event.getWebServer().getPort();
    }

    public Pdf render(String path, Map<String, String> cookies) {
        requirePrintRoute(path);
        if (port == 0) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "伺服器尚未就緒，請稍後再試");
        }
        String origin = "http://localhost:" + port;
        synchronized (lock) {
            Browser b = browser();
            try (BrowserContext context = b.newContext()) {
                context.addCookies(cookies.entrySet().stream()
                    .map(e -> new Cookie(e.getKey(), e.getValue()).setUrl(origin))
                    .toList());
                Page page = context.newPage();
                page.navigate(origin + path);
                page.waitForSelector(".sheet, .page.error, .print-root .page", new Page.WaitForSelectorOptions().setTimeout(PAGE_TIMEOUT_MS));
                if (page.locator(".sheet").count() == 0) {
                    String text = page.locator(".page").first().innerText().strip();
                    throw ApiException.badRequest(text.isEmpty() ? "這份報表沒有資料" : text);
                }
                page.evaluate("() => document.fonts.ready");
                byte[] bytes = page.pdf(new Page.PdfOptions().setPreferCSSPageSize(true).setPrintBackground(true));
                return new Pdf(bytes, page.title());
            } catch (TimeoutError e) {
                log.warn("列印頁 {} 沒有在時限內畫出來", path);
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "列印頁面載入逾時，請改用瀏覽器列印");
            } catch (PlaywrightException e) {
                log.error("列印頁 {} 轉 PDF 失敗，下次重新啟動瀏覽器", path, e);
                reset();
                throw new ApiException(HttpStatus.BAD_GATEWAY, "PDF 轉檔失敗，請再試一次或改用瀏覽器列印");
            }
        }
    }

    /** 只接受列印路由本身加上單純的 query string，避免 %2e%2e 之類的寫法繞過，也不讓非列印頁佔住瀏覽器 30 秒。 */
    private void requirePrintRoute(String path) {
        int q = path.indexOf('?');
        String route = q < 0 ? path : path.substring(0, q);
        String query = q < 0 ? "" : path.substring(q + 1);
        if (!PRINT_ROUTES.contains(route) || !QUERY.matcher(query).matches()) {
            throw ApiException.badRequest("只能轉出列印頁面");
        }
    }

    private Browser browser() {
        if (browser != null && !browser.isConnected()) {
            closeQuietly();
        }
        if (browser != null) {
            return browser;
        }
        if (playwright == null) {
            playwright = Playwright.create(new Playwright.CreateOptions().setEnv(Map.of("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1")));
        }
        for (String channel : channels) {
            try {
                browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setChannel(channel).setHeadless(true));
                log.info("PDF 轉檔使用 {}", channel);
                return browser;
            } catch (PlaywrightException e) {
                log.info("找不到可用的 {}：{}", channel, firstLine(e.getMessage()));
            }
        }
        reset();
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "這台伺服器沒有安裝 Chrome 或 Edge，無法轉 PDF，請改用瀏覽器列印");
    }

    private String firstLine(String message) {
        return message == null ? "" : message.lines().findFirst().orElse("");
    }

    private void closeQuietly() {
        try {
            if (browser != null) {
                browser.close();
            }
        } catch (PlaywrightException e) {
            log.debug("關閉瀏覽器失敗", e);
        } finally {
            browser = null;
        }
    }

    /** 連 driver 行程一起丟掉；它掛掉後 launch 永遠失敗，只重開瀏覽器救不回來。 */
    private void reset() {
        closeQuietly();
        try {
            if (playwright != null) {
                playwright.close();
            }
        } catch (PlaywrightException e) {
            log.debug("關閉 Playwright 失敗", e);
        } finally {
            playwright = null;
        }
    }

    @Override
    public void destroy() {
        synchronized (lock) {
            reset();
        }
    }
}
