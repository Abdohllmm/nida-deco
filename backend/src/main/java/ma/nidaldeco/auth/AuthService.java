package ma.nidaldeco.auth;

import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.error.ApiException;

@Service
public class AuthService {

	/** Message unique : ne révèle ni l'existence du compte ni la nature de l'erreur. */
	static final String INVALID_CREDENTIALS = "Email ou mot de passe incorrect.";

	private final AdminUserRepository users;

	private final PasswordEncoder passwordEncoder;

	private final LoginRateLimiter rateLimiter;

	/** Haché factice : un email inconnu coûte le même temps de calcul qu'un mauvais mot de passe. */
	private final String dummyHash;

	public AuthService(AdminUserRepository users, PasswordEncoder passwordEncoder, LoginRateLimiter rateLimiter) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.rateLimiter = rateLimiter;
		this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	@Transactional(readOnly = true)
	public AdminPrincipal login(String rawEmail, String password, String clientIp) {
		String email = normalizeEmail(rawEmail);
		if (rateLimiter.isBlocked(clientIp, email)) {
			long minutes = Math.max(1, rateLimiter.retryAfter(clientIp, email).toMinutes() + 1);
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
					"Trop de tentatives de connexion. Réessayez dans " + minutes + " minute" + (minutes > 1 ? "s" : "")
							+ ".");
		}
		AdminUser user = users.findByEmail(email).orElse(null);
		boolean matches = passwordEncoder.matches(password, user != null ? user.getPasswordHash() : dummyHash);
		if (user == null || !matches) {
			rateLimiter.recordFailure(clientIp, email);
			throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
		}
		rateLimiter.recordSuccess(clientIp, email);
		return new AdminPrincipal(user.getId(), user.getEmail());
	}

	@Transactional(readOnly = true)
	public AdminPrincipal current(AdminPrincipal principal) {
		return users.findById(principal.id())
			.map(u -> new AdminPrincipal(u.getId(), u.getEmail()))
			.orElseThrow(AuthService::sessionExpired);
	}

	@Transactional
	public void changePassword(AdminPrincipal principal, String currentPassword, String newPassword) {
		AdminUser user = verified(principal, currentPassword);
		if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
			throw ApiException.field(HttpStatus.BAD_REQUEST, "newPassword",
					"Le nouveau mot de passe doit être différent de l'actuel.");
		}
		user.setPasswordHash(passwordEncoder.encode(newPassword));
	}

	@Transactional
	public AdminPrincipal changeEmail(AdminPrincipal principal, String currentPassword, String rawEmail) {
		AdminUser user = verified(principal, currentPassword);
		String email = normalizeEmail(rawEmail);
		if (!email.equals(user.getEmail()) && users.existsByEmail(email)) {
			throw ApiException.field(HttpStatus.CONFLICT, "newEmail", "Cette adresse email ne peut pas être utilisée.");
		}
		user.setEmail(email);
		return new AdminPrincipal(user.getId(), email);
	}

	private AdminUser verified(AdminPrincipal principal, String currentPassword) {
		AdminUser user = users.findById(principal.id()).orElseThrow(AuthService::sessionExpired);
		if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
			throw ApiException.field(HttpStatus.BAD_REQUEST, "currentPassword", "Le mot de passe actuel est incorrect.");
		}
		return user;
	}

	static ApiException sessionExpired() {
		return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session expirée. Veuillez vous reconnecter.");
	}

	public static String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}

}
