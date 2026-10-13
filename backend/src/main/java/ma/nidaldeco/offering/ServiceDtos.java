package ma.nidaldeco.offering;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.media.MediaDto;

public final class ServiceDtos {

	private ServiceDtos() {
	}

	public record Summary(UUID id, String title, String slug, String shortDescription, MediaDto mainImage,
			int displayOrder, PublicationStatus status, boolean featured, boolean demo, Instant updatedAt) {

		public static Summary of(ServiceOffering s) {
			return new Summary(s.getId(), s.getTitle(), s.getSlug(), s.getShortDescription(),
					MediaDto.of(s.getMainImage()), s.getDisplayOrder(), s.getStatus(), s.isFeatured(), s.isDemo(),
					s.getUpdatedAt());
		}
	}

	public record Detail(UUID id, String title, String slug, String shortDescription, String description,
			MediaDto mainImage, List<MediaDto> gallery, List<String> includedItems, int displayOrder,
			PublicationStatus status, boolean featured, boolean demo, Instant createdAt, Instant updatedAt) {

		public static Detail of(ServiceOffering s) {
			return new Detail(s.getId(), s.getTitle(), s.getSlug(), s.getShortDescription(), s.getDescription(),
					MediaDto.of(s.getMainImage()), MediaDto.of(s.getGallery()), List.copyOf(s.getIncludedItems()),
					s.getDisplayOrder(), s.getStatus(), s.isFeatured(), s.isDemo(), s.getCreatedAt(), s.getUpdatedAt());
		}
	}

	public record Request(
			@NotBlank(message = "Le titre est requis.") @Size(max = 180, message = "180 caractères maximum.") String title,
			@Size(max = 200, message = "200 caractères maximum.") @Pattern(regexp = "^$|" + Slugs.PATTERN,
					message = "Utilisez des minuscules, des chiffres et des tirets.") String slug,
			@Size(max = 300, message = "300 caractères maximum.") String shortDescription,
			@Size(max = 10000, message = "10 000 caractères maximum.") String description, UUID mainImageId,
			@Size(max = 20, message = "20 images maximum.") List<UUID> galleryIds,
			@Size(max = 30, message = "30 prestations maximum.") List<@Size(max = 200,
					message = "200 caractères maximum par ligne.") String> includedItems,
			@Min(value = 0, message = "L'ordre doit être positif.") @Max(value = 9999,
					message = "Ordre trop élevé.") Integer displayOrder,
			@NotNull(message = "Le statut est requis.") PublicationStatus status, Boolean featured, Boolean demo) {
	}

	public record StatusUpdate(@NotNull(message = "Le statut est requis.") PublicationStatus status) {
	}

}
