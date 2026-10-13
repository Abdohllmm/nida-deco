package ma.nidaldeco.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Sert les fichiers statiques du build React lorsque FRONTEND_DIST_DIR est renseigné. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final AppProperties properties;

	public WebConfig(AppProperties properties) {
		this.properties = properties;
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		String dir = properties.frontend().distDir();
		if (dir == null || dir.isBlank()) {
			return;
		}
		Path dist = Path.of(dir).toAbsolutePath().normalize();
		if (!Files.isDirectory(dist)) {
			return;
		}
		String location = dist.toUri().toString();
		// Les fichiers de /assets portent une empreinte dans leur nom : cache longue durée.
		registry.addResourceHandler("/assets/**")
			.addResourceLocations(location + "assets/")
			.setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
		registry.addResourceHandler("/**")
			.addResourceLocations(location)
			.setCacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic());
	}

}
