package ma.nidaldeco.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

@ConfigurationProperties("app")
public record AppProperties(String publicBaseUrl, Cors cors, Media media, Security security, Frontend frontend,
		AdminCli adminCli) {

	public record Cors(List<String> allowedOrigins) {

		public List<String> origins() {
			return allowedOrigins == null ? List.of()
					: allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList();
		}
	}

	public record Media(String storageDir, DataSize maxFileSize) {
	}

	public record Security(int loginMaxAttempts, Duration loginWindow, int contactMaxPerWindow,
			Duration contactWindow) {
	}

	public record Frontend(String distDir) {
	}

	public record AdminCli(String email, String password) {
	}

}
