package ma.nidaldeco.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	/** BCrypt ignore tout ce qui dépasse 72 octets : la longueur est bornée en conséquence. */
	public static final int PASSWORD_MIN = 10;

	public static final int PASSWORD_MAX = 72;

	private AuthDtos() {
	}

	public record LoginRequest(@NotBlank(message = "L'email est requis.") @Size(max = 254) String email,
			@NotBlank(message = "Le mot de passe est requis.") @Size(max = 200) String password) {
	}

	public record SessionResponse(String email) {
	}

	public record PasswordChangeRequest(
			@NotBlank(message = "Le mot de passe actuel est requis.") @Size(max = 200) String currentPassword,
			@NotBlank(message = "Le nouveau mot de passe est requis.") @Size(min = PASSWORD_MIN, max = PASSWORD_MAX,
					message = "Le mot de passe doit contenir entre 10 et 72 caractères.") String newPassword) {
	}

	public record EmailChangeRequest(
			@NotBlank(message = "Le mot de passe actuel est requis.") @Size(max = 200) String currentPassword,
			@NotBlank(message = "L'email est requis.") @Email(message = "Adresse email invalide.") @Size(
					max = 254) String newEmail) {
	}

	public record CsrfResponse(String headerName, String token) {
	}

}
