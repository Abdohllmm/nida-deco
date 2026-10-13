package ma.nidaldeco.media;

import java.time.Duration;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.media.ImageInspector.ImageType;

/**
 * Sert les images téléversées. Le type renvoyé est déduit de l'extension générée
 * par le serveur et toujours une image : un fichier téléversé n'est jamais
 * interprété comme du HTML ou un script.
 */
@RestController
public class MediaFileController {

	private final MediaStorage storage;

	public MediaFileController(MediaStorage storage) {
		this.storage = storage;
	}

	@GetMapping("/media/{filename:.+}")
	ResponseEntity<Resource> serve(@PathVariable String filename) {
		if (!MediaStorage.FILENAME.matcher(filename).matches()) {
			throw ApiException.notFound("Image introuvable.");
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
