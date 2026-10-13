package ma.nidaldeco.project;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.category.CategoryDto;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.media.MediaDto;

public final class ProjectDtos {

	private ProjectDtos() {
	}

	public record Summary(UUID id, String title, String slug, CategoryDto category, String location,
			MediaDto mainImage, PublicationStatus status, boolean demo, Instant updatedAt) {

		public static Summary of(Project p) {
			return new Summary(p.getId(), p.getTitle(), p.getSlug(), CategoryDto.of(p.getCategory()), p.getLocation(),
					MediaDto.of(p.getMainImage()), p.getStatus(), p.isDemo(), p.getUpdatedAt());
		}
	}

	public record Detail(UUID id, String title, String slug, CategoryDto category, String description,
			String location, MediaDto mainImage, List<MediaDto> gallery, MediaDto beforeImage, MediaDto afterImage,
			PublicationStatus status, boolean demo, Instant createdAt, Instant updatedAt) {

		public static Detail of(Project p) {
			return new Detail(p.getId(), p.getTitle(), p.getSlug(), CategoryDto.of(p.getCategory()),
					p.getDescription(), p.getLocation(), MediaDto.of(p.getMainImage()), MediaDto.of(p.getGallery()),
					MediaDto.of(p.getBeforeImage()), MediaDto.of(p.getAfterImage()), p.getStatus(), p.isDemo(),
					p.getCreatedAt(), p.getUpdatedAt());
		}
	}

	public record Request(
			@NotBlank(message = "Le titre est requis.") @Size(max = 180, message = "180 caractères maximum.") String title,
			@Size(max = 200, message = "200 caractères maximum.") @Pattern(regexp = "^$|" + Slugs.PATTERN,
					message = "Utilisez des minuscules, des chiffres et des tirets.") String slug,
			@NotNull(message = "Le type de projet est requis.") UUID categoryId,
			@Size(max = 10000, message = "10 000 caractères maximum.") String description,
			@Size(max = 160, message = "160 caractères maximum.") String location, UUID mainImageId,
			@Size(max = 30, message = "30 images maximum.") List<UUID> galleryIds, UUID beforeImageId,
			UUID afterImageId, @NotNull(message = "Le statut est requis.") PublicationStatus status, Boolean demo) {
	}

	public record StatusUpdate(@NotNull(message = "Le statut est requis.") PublicationStatus status) {
	}

}
