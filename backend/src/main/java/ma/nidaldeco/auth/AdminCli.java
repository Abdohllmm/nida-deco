package ma.nidaldeco.auth;

import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.config.AppProperties;

/**
 * Commandes d'exploitation exécutées depuis le serveur, sans interface web :
 * création du premier administrateur et réinitialisation d'un mot de passe.
 * Les identifiants sont lus dans des variables d'environnement temporaires ; le
 * mot de passe n'est jamais affiché ni journalisé.
 *
 * Code de sortie du processus : 0 si l'opération a réussi, 2 si elle a été refusée
 * (variables absentes ou invalides, administrateur déjà existant, compte introuvable).
 */
@Component
@Profile("bootstrap-admin | reset-admin-password")
public class AdminCli implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminCli.class);

	/** Refus métier : arrête le processus avec le code 2. */
	static class Refused extends IllegalStateException implements ExitCodeGenerator {

		Refused(String message) {
			super(message);
		}

		@Override
		public int getExitCode() {
			return 2;
		}

	}

	private final AdminUserRepository users;

	private final PasswordEncoder passwordEncoder;

	private final AppProperties properties;

	private final Environment environment;

	public AdminCli(AdminUserRepository users, PasswordEncoder passwordEncoder, AppProperties properties,
			Environment environment) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.properties = properties;
		this.environment = environment;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		String email = AuthService.normalizeEmail(properties.adminCli().email());
		String password = properties.adminCli().password();
		validate(email, password);
		if (environment.acceptsProfiles(Profiles.of("bootstrap-admin"))) {
			bootstrap(email, password);
		}
		else {
			resetPassword(email, password);
		}
	}

	private void bootstrap(String email, String password) {
		if (users.count() > 0) {
			throw new Refused("Un administrateur existe déjà : la création initiale est refusée. "
					+ "Pour changer un mot de passe, utilisez le profil reset-admin-password.");
		}
		users.save(new AdminUser(email, passwordEncoder.encode(password)));
		log.info("Administrateur créé : {}. Supprimez maintenant les variables BOOTSTRAP_ADMIN_*.", email);
	}

	private void resetPassword(String email, String password) {
		AdminUser user = users.findByEmail(email)
			.orElseThrow(() -> new Refused("Aucun administrateur ne correspond à cet email."));
		user.setPasswordHash(passwordEncoder.encode(password));
		log.info("Mot de passe réinitialisé pour {}. Supprimez maintenant les variables ADMIN_RESET_*.", email);
	}

	private static void validate(String email, String password) {
		if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
			throw new Refused("Email administrateur absent ou invalide (variable BOOTSTRAP_ADMIN_EMAIL ou ADMIN_RESET_EMAIL).");
		}
		int length = password == null ? 0 : password.getBytes(StandardCharsets.UTF_8).length;
		if (password == null || password.length() < AuthDtos.PASSWORD_MIN || length > AuthDtos.PASSWORD_MAX) {
			throw new Refused("Mot de passe absent ou invalide (variable BOOTSTRAP_ADMIN_PASSWORD ou "
					+ "ADMIN_RESET_PASSWORD) : il doit contenir entre " + AuthDtos.PASSWORD_MIN + " et "
					+ AuthDtos.PASSWORD_MAX + " caractères.");
		}
	}

}
