package ma.nidaldeco.media;

import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.core.io.Resource;

/**
 * Abstraction du stockage des fichiers. L'implémentation locale écrit sur disque ;
 * un stockage objet (S3 ou équivalent) peut la remplacer sans toucher au reste.
 */
public interface MediaStorage {

	/** Seule forme de nom acceptée : un UUID généré par le serveur et une extension connue. */
	Pattern FILENAME = Pattern.compile("^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.(jpg|png|webp)$");

	void store(String filename, byte[] content);

	Optional<Resource> load(String filename);

	void delete(String filename);

}
