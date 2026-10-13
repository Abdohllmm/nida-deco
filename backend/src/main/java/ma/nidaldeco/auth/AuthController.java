package ma.nidaldeco.auth;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import ma.nidaldeco.auth.AuthDtos.CsrfResponse;
import ma.nidaldeco.auth.AuthDtos.EmailChangeRequest;
import ma.nidaldeco.auth.AuthDtos.LoginRequest;
import ma.nidaldeco.auth.AuthDtos.PasswordChangeRequest;
import ma.nidaldeco.auth.AuthDtos.SessionResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	public static final String ROLE_ADMIN = "ROLE_ADMIN";

	private final AuthService authService;

	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/** Délivre le jeton CSRF (et son cookie) avant la première opération d'écriture. */
	@GetMapping("/csrf")
	CsrfResponse csrf(CsrfToken token) {
		return new CsrfResponse(token.getHeaderName(), token.getToken());
	}

	@PostMapping("/login")
	SessionResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
			HttpServletResponse response) {
		AdminPrincipal principal = authService.login(body.email(), body.password(), request.getRemoteAddr());
		// Nouvelle session à chaque connexion : empêche la fixation de session.
		HttpSession previous = request.getSession(false);
		if (previous != null) {
			previous.invalidate();
		}
		request.getSession(true);
		storeAuthentication(principal, request, response);
		return new SessionResponse(principal.email());
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void logout(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
	}

	@GetMapping("/me")
	SessionResponse me(Authentication authentication) {
		return new SessionResponse(authService.current(principal(authentication)).email());
	}

	@PutMapping("/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void changePassword(@Valid @RequestBody PasswordChangeRequest body, Authentication authentication) {
		authService.changePassword(principal(authentication), body.currentPassword(), body.newPassword());
	}

	@PutMapping("/email")
	SessionResponse changeEmail(@Valid @RequestBody EmailChangeRequest body, Authentication authentication,
			HttpServletRequest request, HttpServletResponse response) {
		AdminPrincipal updated = authService.changeEmail(principal(authentication), body.currentPassword(),
				body.newEmail());
		storeAuthentication(updated, request, response);
		return new SessionResponse(updated.email());
	}

	private void storeAuthentication(AdminPrincipal principal, HttpServletRequest request,
			HttpServletResponse response) {
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null,
				List.of(new SimpleGrantedAuthority(ROLE_ADMIN))));
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, request, response);
	}

	private static AdminPrincipal principal(Authentication authentication) {
		if (authentication != null && authentication.getPrincipal() instanceof AdminPrincipal principal) {
			return principal;
		}
		throw AuthService.sessionExpired();
	}

}
