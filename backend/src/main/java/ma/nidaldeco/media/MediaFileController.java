package ma.nidaldeco.media;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.media.ImageInspector.ImageType;

/**
 * Sert les images téléversées à l'adresse stable /media/{fichier}, quel que soit le
 * stockage : le frontend et les adresses enregistrées ne changent jamais.
 *
 * Stockage local : le fichier est lu et renvoyé, avec un type toujours « image »
 * déduit de l'extension générée par le serveur. Stockage objet : redirection vers
 * l'adresse publique du fichier, uniquement s'il est connu de la base.
 */
@RestController
public class MediaFileController {

	private final MediaStorage storage;

	private final MediaAssetRepository assets;

	public MediaFileController(MediaStorage storage, MediaAssetRepository assets) {
		this.storage = storage;
		this.assets = assets;
	}

	@GetMapping("/media/{filename:.+}")
	ResponseEntity<Resource> serve(@PathVariable String filename) {
		if (!MediaStorage.FILENAME.matcher(filename).matches()) {
			throw ApiException.notFound("Image introuvable.");
		}
		Optional<URI> publicUrl = storage.publicUrl(filename);
		if (publicUrl.isPresent()) {
			// On ne redirige que vers un fichier réellement enregistré : jamais d'adresse inventée.
			if (!assets.existsByFilename(filename)) {
				throw ApiException.notFound("Image introuvable.");
			}
			return ResponseEntity.status(HttpStatus.FOUND)
				.location(publicUrl.get())
				.cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
				.build();
		}
		Resource resource = storage.load(filename).orElseThrow(() -> ApiException.notFound("Image introuvable."));
		ImageType type = ImageType.fromExtension(filename.substring(filename.lastIndexOf('.') + 1)).orElseThrow();
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(type.contentType()))
			// Les noms étant uniques et jamais réutilisés, le fichier peut être mis en cache durablement.
			.cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
			.header(HttpHeaders.CONTENT_DISPOSITION, "inline")
			.header("X-Content-Type-Options", "nosniff")
			.body(resource);
	}

}
