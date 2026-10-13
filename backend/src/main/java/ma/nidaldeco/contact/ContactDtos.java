package ma.nidaldeco.contact;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.nidaldeco.contact.ContactRequest.NeedType;
import ma.nidaldeco.contact.ContactRequest.Status;

public final class ContactDtos {

	private ContactDtos() {
	}

	public record Create(
			@NotBlank(message = "Votre nom est requis.") @Size(max = 120, message = "120 caractères maximum.") String name,
			@NotBlank(message = "Votre téléphone est requis.") @Pattern(regexp = "^\\+?[0-9][0-9 .()-]{5,24}$",
					message = "Numéro de téléphone invalide.") String phone,
			@Email(message = "Adresse email invalide.") @Size(max = 254, message = "Adresse email trop longue.") String email,
			@NotNull(message = "Le type de besoin est requis.") NeedType needType,
			@NotBlank(message = "Votre message est requis.") @Size(min = 10, max = 4000,
					message = "Le message doit contenir entre 10 et 4 000 caractères.") String message,
			@Size(max = 160, message = "160 caractères maximum.") String location,
			@Size(max = 80, message = "80 caractères maximum.") String budget,
			@NotNull(message = "Votre accord est nécessaire pour que nous puissions vous recontacter.") @AssertTrue(
					message = "Votre accord est nécessaire pour que nous puissions vous recontacter.") Boolean consent) {
	}

	/** Accusé d'enregistrement renvoyé au visiteur : aucune donnée personnelle n'est renvoyée. */
	public record Receipt(UUID id, Instant createdAt) {
	}

	public record Admin(UUID id, String name, String phone, String email, NeedType needType, String message,
			String location, String budget, boolean consent, Status status, Instant createdAt, Instant updatedAt) {

		public static Admin of(ContactRequest r) {
			return new Admin(r.getId(), r.getName(), r.getPhone(), r.getEmail(), r.getNeedType(), r.getMessage(),
					r.getLocation(), r.getBudget(), r.isConsent(), r.getStatus(), r.getCreatedAt(), r.getUpdatedAt());
		}
	}

	public record StatusUpdate(@NotNull(message = "Le statut est requis.") Status status) {
	}

}
