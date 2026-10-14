package ma.nidaldeco.media;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import ma.nidaldeco.config.AppProperties;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/**
 * Choisit le stockage des médias selon app.media.storage (variable
 * APP_MEDIA_STORAGE) : « filesystem » ou « s3 ». Une configuration incomplète
 * arrête le démarrage avec la liste des variables manquantes — jamais leurs valeurs.
 */
@Configuration
public class MediaStorageConfig {

	public static final String FILESYSTEM = "filesystem";

	public static final String S3 = "s3";

	private static final Logger log = LoggerFactory.getLogger(MediaStorageConfig.class);

	@Bean
	@Lazy(false)
	@ConditionalOnProperty(name = "app.media.storage", havingValue = S3)
	S3Client s3Client(AppProperties properties) {
		AppProperties.S3 s3 = validated(properties);
		return S3Client.builder()
			.endpointOverride(URI.create(s3.endpoint().trim()))
			.region(Region.of(s3.region().trim()))
			.credentialsProvider(StaticCredentialsProvider
				.create(AwsBasicCredentials.create(s3.accessKeyId().trim(), s3.secretAccessKey().trim())))
			// Adressage par chemin (endpoint/bucket/clé) : requis par Supabase Storage, accepté par les autres services S3.
			.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
			// Les sommes de contrôle optionnelles du SDK ne sont pas acceptées par tous les services compatibles.
			.requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
			.responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
			.build();
	}

	/** Jamais paresseux : une configuration incomplète doit empêcher le démarrage, pas le premier envoi. */
	@Bean
	@Lazy(false)
	MediaStorage mediaStorage(AppProperties properties, ObjectProvider<S3Client> s3Client) {
		return switch (storageType(properties)) {
			case S3 -> {
				AppProperties.S3 s3 = validated(properties);
				log.info("Stockage des médias : objet S3, bucket « {} », adresse publique {}", s3.bucket().trim(),
						s3.publicBaseUrl().trim());
				yield new S3MediaStorage(s3Client.getObject(), s3.bucket().trim(), s3.publicBaseUrl().trim());
			}
			default -> new FilesystemMediaStorage(properties.media().storageDir());
		};
	}

	/** « filesystem » par défaut ; toute autre valeur que les deux prévues est refusée. */
	static String storageType(AppProperties properties) {
		String raw = properties.media().storage();
		String value = raw == null || raw.isBlank() ? FILESYSTEM : raw.trim().toLowerCase(Locale.ROOT);
		if (!value.equals(FILESYSTEM) && !value.equals(S3)) {
			throw new IllegalStateException(
					"APP_MEDIA_STORAGE invalide : « " + raw + " ». Valeurs acceptées : filesystem, s3.");
		}
		return value;
	}

	/** Vérifie la configuration S3 ; le message ne cite que des noms de variables. */
	static AppProperties.S3 validated(AppProperties properties) {
		AppProperties.S3 s3 = properties.media().s3();
		List<String> problems = new ArrayList<>();
		if (s3 == null) {
			throw new IllegalStateException("APP_MEDIA_STORAGE=s3 : la configuration S3 est absente.");
		}
		required(problems, "S3_ENDPOINT", s3.endpoint());
		required(problems, "S3_REGION", s3.region());
		required(problems, "S3_BUCKET", s3.bucket());
		required(problems, "S3_ACCESS_KEY_ID", s3.accessKeyId());
		required(problems, "S3_SECRET_ACCESS_KEY", s3.secretAccessKey());
		required(problems, "S3_PUBLIC_BASE_URL", s3.publicBaseUrl());
		if (!problems.isEmpty()) {
			throw new IllegalStateException(
					"APP_MEDIA_STORAGE=s3 : variable(s) d'environnement manquante(s) : " + String.join(", ", problems));
		}
		httpUrl(problems, "S3_ENDPOINT", s3.endpoint());
		httpUrl(problems, "S3_PUBLIC_BASE_URL", s3.publicBaseUrl());
		if (!problems.isEmpty()) {
			throw new IllegalStateException("APP_MEDIA_STORAGE=s3 : adresse invalide (attendu : https://…) pour : "
					+ String.join(", ", problems));
		}
		String incoherence = incoherence(s3);
		if (incoherence != null) {
			throw new IllegalStateException("APP_MEDIA_STORAGE=s3 : " + incoherence);
		}
		return s3;
	}

	/**
	 * Détecte les confusions classiques entre l'endpoint de l'API S3 (où le serveur
	 * envoie les fichiers) et l'adresse publique (où les navigateurs les lisent).
	 * Renvoie un message sans aucune valeur secrète, ou null si tout est cohérent.
	 */
	static String incoherence(AppProperties.S3 s3) {
		URI endpoint = URI.create(s3.endpoint().trim().replaceAll("/+$", ""));
		URI publicBase = URI.create(s3.publicBaseUrl().trim().replaceAll("/+$", ""));
		String bucket = s3.bucket().trim();
		String region = s3.region().trim();
		String endpointPath = endpoint.getPath() == null ? "" : endpoint.getPath();
		String publicPath = publicBase.getPath() == null ? "" : publicBase.getPath();

		if (!region.matches("^[a-z0-9-]+$")) {
			return "S3_REGION invalide : attendu un identifiant de région en minuscules, par exemple eu-central-1.";
		}
		if (endpoint.equals(publicBase)) {
			return "S3_ENDPOINT et S3_PUBLIC_BASE_URL sont identiques : l'endpoint est l'adresse de l'API S3, "
					+ "S3_PUBLIC_BASE_URL celle où les images sont lisibles publiquement.";
		}
		if (endpointPath.contains("/object/public")) {
			return "S3_ENDPOINT contient une adresse publique d'objets : indiquez l'endpoint de l'API S3.";
		}
		if (publicPath.endsWith("/s3")) {
			return "S3_PUBLIC_BASE_URL contient l'endpoint de l'API S3 : indiquez l'adresse publique des objets.";
		}
		// Supabase Storage : formes d'adresses documentées, vérifiées pour éviter une image jamais lisible.
		if (isSupabase(endpoint) || isSupabase(publicBase)) {
			if (!isSupabase(endpoint) || !endpointPath.equals("/storage/v1/s3")) {
				return "S3_ENDPOINT : pour Supabase, attendu https://REF_DU_PROJET.storage.supabase.co/storage/v1/s3";
			}
			if (!isSupabase(publicBase) || !publicPath.equals("/storage/v1/object/public/" + bucket)) {
				return "S3_PUBLIC_BASE_URL : pour Supabase, attendu "
						+ "https://REF_DU_PROJET.supabase.co/storage/v1/object/public/NOM_DU_BUCKET (bucket = S3_BUCKET)";
			}
			if (!projectRef(endpoint).equals(projectRef(publicBase))) {
				return "S3_ENDPOINT et S3_PUBLIC_BASE_URL ne désignent pas le même projet Supabase.";
			}
			if (region.equals("auto")) {
				return "S3_REGION : pour Supabase, indiquez la région du projet (par exemple eu-central-1), pas « auto ».";
			}
		}
		return null;
	}

	private static boolean isSupabase(URI uri) {
		String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
		return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
	}

	/** Référence du projet : premier libellé du nom d'hôte (REF.supabase.co ou REF.storage.supabase.co). */
	private static String projectRef(URI uri) {
		String host = uri.getHost().toLowerCase(Locale.ROOT);
		return host.substring(0, host.indexOf('.'));
	}

	/** Origine (schéma + hôte) du domaine public des médias, lorsque le stockage objet est actif. */
	public static Optional<String> publicOrigin(AppProperties properties) {
		if (!S3.equals(storageType(properties))) {
			return Optional.empty();
		}
		URI uri = URI.create(validated(properties).publicBaseUrl().trim());
		return Optional.of(uri.getScheme() + "://" + uri.getAuthority());
	}

	private static void required(List<String> problems, String name, String value) {
		if (value == null || value.isBlank()) {
			problems.add(name);
		}
	}

	private static void httpUrl(List<String> problems, String name, String value) {
		try {
			URI uri = URI.create(value.trim());
			boolean http = "https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme());
			if (!http || uri.getHost() == null || uri.getQuery() != null || uri.getFragment() != null) {
				problems.add(name);
			}
		}
		catch (IllegalArgumentException ex) {
			problems.add(name);
		}
	}

}
