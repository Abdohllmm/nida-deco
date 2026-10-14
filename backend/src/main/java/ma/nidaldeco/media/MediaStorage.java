package ma.nidaldeco.media;

import java.net.URI;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.core.io.Resource;

/**
 * Abstraction du stockage des fichiers. Deux implémentations, choisies par la
 * propriété app.media.storage : disque local ({@link FilesystemMediaStorage}) ou
 * stockage objet compatible S3 ({@link S3MediaStorage}).
 */
public interface MediaStorage {

	/** Seule forme de nom acceptée : un UUID généré par le serveur et une extension connue. */
	Pattern FILENAME = Pattern.compile("^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.(jpg|png|webp)$");

	void store(String filename, byte[] content);

	Optional<Resource> load(String filename);

	void delete(String filename);

	/**
	 * Adresse publique du fichier lorsque le stockage le sert lui-même (stockage
	 * objet). Vide lorsque l'application doit lire le fichier et le renvoyer.
	 */
	default Optional<URI> publicUrl(String filename) {
		return Optional.empty();
	}

}
