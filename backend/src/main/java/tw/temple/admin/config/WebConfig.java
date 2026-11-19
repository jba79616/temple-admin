package tw.temple.admin.config;

import java.io.IOException;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requested = location.createRelative(resourcePath);
                    if (requested.exists() && requested.isReadable()) {
                        return requested;
                    }
                    if (resourcePath.startsWith("api/") || isMissingAsset(resourcePath)) {
                        return null;
                    }
                    Resource index = new ClassPathResource("/static/index.html");
                    return index.exists() ? index : null;
                }
            });
    }

    /** Vite 的產出只有 assets/、fonts/ 兩個目錄和根目錄的檔案；SPA 路由都是不帶副檔名的多段路徑。 */
    private static boolean isMissingAsset(String path) {
        return path.startsWith("assets/") || path.startsWith("fonts/") || (!path.contains("/") && path.contains("."));
    }
}
