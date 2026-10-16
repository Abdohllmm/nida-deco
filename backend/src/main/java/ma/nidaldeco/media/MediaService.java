package ma.nidaldeco.media;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.config.AppProperties;
import ma.nidaldeco.media.ImageInspector.ImageInfo;
import ma.nidaldeco.media.ImageInspector.ImageType;

@Service
public class MediaService {

	private final MediaAssetRepository repository;

	private final MediaStorage storage;

	private final long maxBytes;

	public MediaService(MediaAssetRepository repository, MediaStorage storage, AppProperties properties) {
		this.repository = repository;
		this.storage = storage;
		this.maxBytes = properties.media().maxFileSize().toBytes();
	}

	@Transactional
	public MediaAsset store(byte[] content, String originalName, String declaredContentType, String altText) {
		if (content == null || content.length == 0) {
			throw ApiException.badRequest("FILE_EMPTY", "Le fichier est vide.");
		}
		if (content.length > maxBytes) {
			throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE",
					"Le fichier dépasse la taille maximale autorisée.");
		}
		ImageType declared = ImageType.fromContentType(declaredContentType)
			.orElseThrow(() -> new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "FILE_TYPE_NOT_ALLOWED",
					"Format non pris en charge. Utilisez une image JPEG, PNG ou WebP."));
		ImageInfo info = ImageInspector.inspect(content)
			.orElseThrow(() -> new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "FILE_CONTENT_INVALID",
					"Le contenu du fichier n'est pas une image JPEG, PNG ou WebP valide."));
		if (info.type() != declared) {
			throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "FILE_CONTENT_INVALID",
					"Le contenu du fichier ne correspond pas au format annoncé.");
		}
		// Le nom et l'extension sont générés ici : rien ne provient du nom d'origine.
		String filename = UUID.randomUUID() + "." + info.type().extension();
		storage.store(filename, content);
		try {
			return repository.saveAndFlush(new MediaAsset(filename, sanitizeName(originalName),
					info.type().contentType(), content.length, info.width(), info.height(), truncate(altText, 255)));
		}
		catch (RuntimeException ex) {
			storage.delete(filename);
			throw ex;
		}
	}

	@Transactional(readOnly = true)
	public PageResponse<MediaDto.Admin> list(int page, int size) {
		return PageResponse.of(repository.findAll(PageResponse.request(page, size, Sort.by("createdAt").descending())),
				this::toAdmin);
	}

	@Transactional
	public MediaDto.Admin updateAlt(UUID id, String alt) {
		MediaAsset asset = get(id);
		asset.setAltText(alt.trim());
		return toAdmin(asset);
	}

	/** Suppression refusée tant que le média est utilisé par un contenu ou par les paramètres. */
	@Transactional
	public void delete(UUID id) {
		MediaAsset asset = get(id);
		long usages = repository.countUsages(id);
		if (usages > 0) {
			throw ApiException.conflict("MEDIA_IN_USE", "Cette image est encore utilisée (" + usages
					+ " emplacement" + (usages > 1 ? "s" : "") + "). Retirez-la des contenus concernés avant de la supprimer.");
		}
		repository.delete(asset);
		repository.flush();
		storage.delete(asset.getFilename());
	}

	@Transactional(readOnly = true)
	public MediaAsset get(UUID id) {
		return repository.findById(id).orElseThrow(() -> ApiException.notFound("Image introuvable."));
	}

	/** Résout une image optionnelle désignée par un formulaire d'administration. */
	@Transactional(readOnly = true)
	public MediaAsset resolve(UUID id, String field) {
		if (id == null) {
			return null;
		}
		return repository.findById(id)
			.orElseThrow(() -> ApiException.field(HttpStatus.BAD_REQUEST, field, "Image introuvable."));
	}

	/** Résout une galerie en conservant l'ordre fourni et en ignorant les doublons. */
	@Transactional(readOnly = true)
	public List<MediaAsset> resolveAll(List<UUID> ids, String field) {
		List<MediaAsset> assets = new ArrayList<>();
		if (ids != null) {
			for (UUID id : new LinkedHashSet<>(ids)) {
				assets.add(resolve(id, field));
			}
		}
		return assets;
	}

	private MediaDto.Admin toAdmin(MediaAsset a) {
		// Comme MediaDto : adresse publique directe avec un stockage objet, sans passer par « /media/ ».
		String url = storage.publicUrl(a.getFilename()).map(Object::toString).orElse("/media/" + a.getFilename());
		return new MediaDto.Admin(a.getId(), url, a.getAltText(), a.getWidth(), a.getHeight(),
				a.getOriginalName(), a.getContentType(), a.getSizeBytes(), repository.countUsages(a.getId()),
				a.getCreatedAt());
	}

	private static String sanitizeName(String name) {
		if (name == null) {
			return null;
		}
		String base = name.replace('\\', '/');
		base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
		return base.isEmpty() ? null : truncate(base, 255);
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return "";
		}
		String trimmed = value.trim();
		return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
	}

}
