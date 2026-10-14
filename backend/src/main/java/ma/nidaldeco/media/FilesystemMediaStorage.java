package ma.nidaldeco.media;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

/** Stockage sur disque local : développement, ou serveur disposant d'un disque persistant. */
public class FilesystemMediaStorage implements MediaStorage {

	private static final Logger log = LoggerFactory.getLogger(FilesystemMediaStorage.class);

	private final Path root;

	public FilesystemMediaStorage(String storageDir) {
		this.root = Path.of(storageDir).toAbsolutePath().normalize();
		try {
			Files.createDirectories(root);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Impossible de créer le dossier des médias : " + root, ex);
		}
		log.info("Stockage des médias : {}", root);
	}

	@Override
	public void store(String filename, byte[] content) {
		Path target = resolve(filename)
			.orElseThrow(() -> new IllegalArgumentException("Nom de fichier refusé : " + filename));
		try {
			// Écriture dans un fichier temporaire puis déplacement : jamais de fichier partiel visible.
			Path temp = Files.createTempFile(root, "upload-", ".tmp");
			Files.write(temp, content);
			Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Échec de l'écriture du média " + filename, ex);
		}
	}

	@Override
	public Optional<Resource> load(String filename) {
		return resolve(filename).filter(Files::isRegularFile).map(FileSystemResource::new);
	}

	@Override
	public void delete(String filename) {
		resolve(filename).ifPresent(path -> {
			try {
				Files.deleteIfExists(path);
			}
			catch (IOException ex) {
				log.warn("Fichier média non supprimé : {}", path, ex);
			}
		});
	}

	/** Refuse tout nom non généré par le serveur et tout chemin sortant du dossier racine. */
	private Optional<Path> resolve(String filename) {
		if (filename == null || !FILENAME.matcher(filename).matches()) {
			return Optional.empty();
		}
		Path path = root.resolve(filename).normalize();
		return path.startsWith(root) ? Optional.of(path) : Optional.empty();
	}

}
