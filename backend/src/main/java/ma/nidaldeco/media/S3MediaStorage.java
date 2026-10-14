package ma.nidaldeco.media;

import java.net.URI;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;

import ma.nidaldeco.media.ImageInspector.ImageType;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Stockage objet compatible S3 (Supabase Storage, MinIO, AWS S3…). Les fichiers sont
 * rangés sous le préfixe « media/ » et lus directement par le navigateur à leur
 * adresse publique : l'application ne dépend d'aucun disque local.
 */
public class S3MediaStorage implements MediaStorage {

	static final String PREFIX = "media/";

	private static final Logger log = LoggerFactory.getLogger(S3MediaStorage.class);

	private final S3Client client;

	private final String bucket;

	private final String publicBaseUrl;

	public S3MediaStorage(S3Client client, String bucket, String publicBaseUrl) {
		this.client = client;
		this.bucket = bucket;
		this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
	}

	@Override
	public void store(String filename, byte[] content) {
		String key = key(filename).orElseThrow(() -> new IllegalArgumentException("Nom de fichier refusé : " + filename));
		ImageType type = ImageType.fromExtension(filename.substring(filename.lastIndexOf('.') + 1)).orElseThrow();
		PutObjectRequest request = PutObjectRequest.builder()
			.bucket(bucket)
			.key(key)
			.contentType(type.contentType())
			// Les noms étant uniques et jamais réutilisés, le fichier peut être mis en cache durablement.
			.cacheControl("public, max-age=31536000, immutable")
			.build();
		try {
			client.putObject(request, RequestBody.fromBytes(content));
		}
		catch (SdkException ex) {
			throw new IllegalStateException("Échec de l'envoi du média vers le stockage objet.", ex);
		}
	}

	/** Le navigateur lit le fichier à son adresse publique : rien n'est relayé par l'application. */
	@Override
	public Optional<Resource> load(String filename) {
		return Optional.empty();
	}

	@Override
	public void delete(String filename) {
		key(filename).ifPresent(key -> {
			try {
				client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
			}
			catch (SdkException ex) {
				log.warn("Objet non supprimé du stockage : {}", key, ex);
			}
		});
	}

	@Override
	public Optional<URI> publicUrl(String filename) {
		return key(filename).map(key -> URI.create(publicBaseUrl + "/" + key));
	}

	/** Clé d'objet : uniquement à partir d'un nom généré par le serveur, jamais d'un chemin fourni. */
	private static Optional<String> key(String filename) {
		return filename != null && FILENAME.matcher(filename).matches() ? Optional.of(PREFIX + filename)
				: Optional.empty();
	}

}
