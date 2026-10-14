package ma.nidaldeco.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.nidaldeco.common.error.ApiError;
import ma.nidaldeco.media.MediaStorageConfig;
import tools.jackson.databind.json.JsonMapper;

@Configuration
@ConditionalOnWebApplication
public class SecurityConfig {

	/**
	 * Le build React ne contient ni script ni style en ligne exécutable ; seuls les
	 * attributs style posés par React nécessitent 'unsafe-inline' côté styles.
	 */
	private static final String CONTENT_SECURITY_POLICY = "default-src 'self'; img-src 'self' data: blob:%s; "
			+ "style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; "
			+ "form-action 'self'; frame-ancestors 'none'";

	private final JsonMapper jsonMapper;

	private final String contentSecurityPolicy;

	public SecurityConfig(JsonMapper jsonMapper, AppProperties properties) {
		this.jsonMapper = jsonMapper;
		// En stockage objet, /media redirige vers le domaine public du bucket : il doit être
		// autorisé comme source d'images, et lui seul.
		this.contentSecurityPolicy = CONTENT_SECURITY_POLICY
			.formatted(MediaStorageConfig.publicOrigin(properties).map(origin -> " " + origin).orElse(""));
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.cors(Customizer.withDefaults())
			// Jeton CSRF dans un cookie lisible par l'application React, renvoyé dans l'en-tête X-XSRF-TOKEN.
			.csrf(CsrfConfigurer::spa)
			.authorizeHttpRequests(auth -> auth.requestMatchers("/api/admin/**")
				.hasRole("ADMIN")
				.requestMatchers("/api/auth/me", "/api/auth/password", "/api/auth/email")
				.hasRole("ADMIN")
				.anyRequest()
				.permitAll())
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint((request, response, e) -> write(request, response, HttpStatus.UNAUTHORIZED,
						"UNAUTHENTICATED", "Authentification requise."))
				.accessDeniedHandler((request, response, e) -> {
					boolean csrf = e instanceof MissingCsrfTokenException
							|| e instanceof org.springframework.security.web.csrf.InvalidCsrfTokenException;
					write(request, response, HttpStatus.FORBIDDEN, csrf ? "CSRF_INVALID" : "FORBIDDEN",
							csrf ? "Jeton de sécurité absent ou expiré. Veuillez réessayer." : "Accès refusé.");
				}))
			.headers(headers -> headers.contentSecurityPolicy(csp -> csp.policyDirectives(contentSecurityPolicy))
				.referrerPolicy(r -> r.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
				.frameOptions(HeadersConfigurer.FrameOptionsConfig::deny))
			.requestCache(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable);
		return http.build();
	}

	/** CORS fermé par défaut : seules les origines listées dans la configuration sont admises. */
	@Bean
	CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		List<String> origins = properties.cors().origins();
		if (!origins.isEmpty()) {
			CorsConfiguration config = new CorsConfiguration();
			config.setAllowedOrigins(origins);
			config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
			config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
			config.setAllowCredentials(true);
			config.setMaxAge(3600L);
			source.registerCorsConfiguration("/api/**", config);
		}
		return source;
	}

	/**
	 * L'authentification est réalisée par AuthService. Ce bean existe uniquement pour
	 * que Spring Boot ne crée pas d'utilisateur par défaut avec un mot de passe généré.
	 */
	@Bean
	UserDetailsService userDetailsService() {
		return username -> {
			throw new UsernameNotFoundException("Authentification par UserDetailsService désactivée.");
		};
	}

	private void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code,
			String message) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		jsonMapper.writeValue(response.getWriter(),
				ApiError.of(status.value(), code, message, null, request.getRequestURI()));
	}

}
