package ma.nidaldeco.settings;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.media.MediaDto;

public final class SettingsDtos {

	private SettingsDtos() {
	}

	public record View(String displayName, String phone, String whatsappNumber, String secondaryPhone,
			String secondaryWhatsappNumber, String instagramUrl,
			String contactEmail, String city, String address, String openingHours, String aboutText, MediaDto logo,
			String heroTitle, String heroSubtitle, MediaDto heroImage, String introTitle, String introText) {

		public static View of(CompanySettings s) {
			return new View(s.displayName, s.phone, s.whatsappNumber, s.secondaryPhone, s.secondaryWhatsappNumber,
					s.instagramUrl, s.contactEmail, s.city,
					s.address, s.openingHours, s.aboutText, MediaDto.of(s.logo), s.heroTitle, s.heroSubtitle,
					MediaDto.of(s.heroImage), s.introTitle, s.introText);
		}
	}

	public record Update(
			@NotBlank(message = "Le nom affiché est requis.") @Size(max = 120,
					message = "120 caractères maximum.") String displayName,
			@NotNull @Pattern(regexp = "^$|^\\+?[0-9][0-9 .()-]{5,24}$",
					message = "Numéro de téléphone invalide.") String phone,
			@NotNull @Pattern(regexp = "^$|^[1-9][0-9]{7,14}$",
					message = "Format international sans « + » ni espaces, par exemple 212661568771.") String whatsappNumber,
			// Second numéro facultatif : absent ou vide = aucun second numéro.
			@Pattern(regexp = "^$|^\\+?[0-9][0-9 .()-]{5,24}$",
					message = "Numéro de téléphone invalide.") String secondaryPhone,
			@Pattern(regexp = "^$|^[1-9][0-9]{7,14}$",
					message = "Format international sans « + » ni espaces, par exemple 212653878201.") String secondaryWhatsappNumber,
			@NotNull @Size(max = 255, message = "255 caractères maximum.") @Pattern(
					regexp = "^$|^https://(www\\.)?instagram\\.com/[A-Za-z0-9._]+/?$",
					message = "Lien attendu : https://www.instagram.com/votre_compte/") String instagramUrl,
			@NotNull @Email(message = "Adresse email invalide.") @Size(max = 254,
					message = "Adresse email trop longue.") String contactEmail,
			@NotNull @Size(max = 120, message = "120 caractères maximum.") String city,
			@NotNull @Size(max = 300, message = "300 caractères maximum.") String address,
			@NotNull @Size(max = 500, message = "500 caractères maximum.") String openingHours,
			@NotNull @Size(max = 5000, message = "5 000 caractères maximum.") String aboutText, UUID logoId,
			@NotNull @Size(max = 200, message = "200 caractères maximum.") String heroTitle,
			@NotNull @Size(max = 500, message = "500 caractères maximum.") String heroSubtitle, UUID heroImageId,
			@NotNull @Size(max = 200, message = "200 caractères maximum.") String introTitle,
			@NotNull @Size(max = 5000, message = "5 000 caractères maximum.") String introText) {
	}

}
