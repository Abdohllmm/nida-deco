package ma.nidaldeco.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.category.CategoryDto;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.media.MediaDto;

public final class ProductDtos {

	private ProductDtos() {
	}

	public record Summary(UUID id, String name, String slug, String reference, String shortDescription,
			CategoryDto category, BigDecimal price, Availability availability, PublicationStatus status,
			boolean featured, boolean demo, MediaDto mainImage, Instant updatedAt) {

		public static Summary of(Product p) {
			return new Summary(p.getId(), p.getName(), p.getSlug(), p.getReference(), p.getShortDescription(),
					CategoryDto.of(p.getCategory()), p.getPrice(), p.getAvailability(), p.getStatus(), p.isFeatured(),
					p.isDemo(), MediaDto.of(p.getMainImage()), p.getUpdatedAt());
		}
	}

	public record Detail(UUID id, String name, String slug, String reference, String shortDescription,
			String description, CategoryDto category, BigDecimal price, Availability availability, String dimensions,
			String materials, List<String> colorOptions, MediaDto mainImage, List<MediaDto> gallery,
			PublicationStatus status, boolean featured, boolean demo, Instant createdAt, Instant updatedAt) {

		public static Detail of(Product p) {
			return new Detail(p.getId(), p.getName(), p.getSlug(), p.getReference(), p.getShortDescription(),
					p.getDescription(), CategoryDto.of(p.getCategory()), p.getPrice(), p.getAvailability(),
					p.getDimensions(), p.getMaterials(), List.copyOf(p.getColorOptions()),
					MediaDto.of(p.getMainImage()), MediaDto.of(p.getGallery()), p.getStatus(), p.isFeatured(),
					p.isDemo(), p.getCreatedAt(), p.getUpdatedAt());
		}
	}

	public record PublicDetail(Detail product, List<Summary> similar) {
	}

	public record Request(
			@NotBlank(message = "Le nom est requis.") @Size(max = 180, message = "180 caractères maximum.") String name,
			@Size(max = 200, message = "200 caractères maximum.") @Pattern(regexp = "^$|" + Slugs.PATTERN,
					message = "Utilisez des minuscules, des chiffres et des tirets.") String slug,
			@NotBlank(message = "La référence est requise.") @Size(max = 60,
					message = "60 caractères maximum.") @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9._/-]*$",
							message = "Lettres, chiffres, points, tirets et barres obliques uniquement.") String reference,
			@Size(max = 300, message = "300 caractères maximum.") String shortDescription,
			@Size(max = 10000, message = "10 000 caractères maximum.") String description,
			@NotNull(message = "La catégorie est requise.") UUID categoryId,
			@DecimalMin(value = "0.01", message = "Le prix doit être supérieur à 0. Laissez vide pour « Prix sur demande ».")
			@DecimalMax(value = "9999999.99", message = "Prix trop élevé.") @Digits(integer = 10, fraction = 2,
					message = "Deux décimales maximum.") BigDecimal price,
			@NotNull(message = "La disponibilité est requise.") Availability availability,
			@Size(max = 200, message = "200 caractères maximum.") String dimensions,
			@Size(max = 300, message = "300 caractères maximum.") String materials,
			@Size(max = 20, message = "20 options maximum.") List<@Size(max = 60,
					message = "60 caractères maximum par option.") String> colorOptions,
			UUID mainImageId, @Size(max = 20, message = "20 images maximum.") List<UUID> galleryIds,
			@NotNull(message = "Le statut est requis.") PublicationStatus status, Boolean featured, Boolean demo) {
	}

	public record StatusUpdate(@NotNull(message = "Le statut est requis.") PublicationStatus status) {
	}

	public record FeaturedUpdate(@NotNull(message = "La valeur est requise.") Boolean featured) {
	}

}
