package ma.nidaldeco.category;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.common.Slugs;

/** itemCount n'est renseigné que pour l'administration. */
public record CategoryDto(UUID id, String name, String slug, int position, Long itemCount) {

	public static CategoryDto of(CategoryBase category) {
		return new CategoryDto(category.getId(), category.getName(), category.getSlug(), category.getPosition(), null);
	}

	public record Request(
			@NotBlank(message = "Le nom est requis.") @Size(max = 120, message = "120 caractères maximum.") String name,
			@Size(max = 140, message = "140 caractères maximum.") @Pattern(regexp = "^$|" + Slugs.PATTERN,
					message = "Utilisez des minuscules, des chiffres et des tirets.") String slug,
			@Min(value = 0, message = "La position doit être positive.") @Max(value = 9999,
					message = "Position trop élevée.") Integer position) {
	}

}
