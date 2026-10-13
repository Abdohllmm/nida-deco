package ma.nidaldeco.media;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MediaDto(UUID id, String url, String alt, Integer width, Integer height) {

	public static MediaDto of(MediaAsset asset) {
		return asset == null ? null : new MediaDto(asset.getId(), "/media/" + asset.getFilename(), asset.getAltText(),
				asset.getWidth(), asset.getHeight());
	}

	public static List<MediaDto> of(List<MediaAsset> assets) {
		return assets.stream().map(MediaDto::of).toList();
	}

	/** Vue de la médiathèque d'administration. */
	public record Admin(UUID id, String url, String alt, Integer width, Integer height, String originalName,
			String contentType, long sizeBytes, long usageCount, Instant createdAt) {
	}

	public record AltUpdate(@NotNull(message = "Le texte alternatif est requis.") @Size(max = 255,
			message = "255 caractères maximum.") String alt) {
	}

}
