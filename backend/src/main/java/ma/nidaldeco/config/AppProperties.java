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

	/**
	 * storage : « filesystem » (disque local, développement) ou « s3 » (stockage objet
	 * compatible S3, obligatoire sur un hébergeur à disque éphémère).
	 */
	public record Media(String storage, String storageDir, DataSize maxFileSize, S3 s3) {
	}

	public record S3(String endpoint, String region, String bucket, String accessKeyId, String secretAccessKey,
			String publicBaseUrl) {

		/** Ne révèle jamais les identifiants, même si l'objet est journalisé par erreur. */
		@Override
		public String toString() {
			return "S3[endpoint=" + endpoint + ", region=" + region + ", bucket=" + bucket
					+ ", accessKeyId=***, secretAccessKey=***, publicBaseUrl=" + publicBaseUrl + "]";
		}
	}

	public record Security(int loginMaxAttempts, Duration loginWindow, int contactMaxPerWindow,
			Duration contactWindow) {
	}

	public record Frontend(String distDir) {
	}

	public record AdminCli(String email, String password) {
	}

}
