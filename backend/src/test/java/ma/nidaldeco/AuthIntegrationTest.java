package ma.nidaldeco;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import ma.nidaldeco.auth.AdminUser;
import ma.nidaldeco.auth.AdminUserRepository;

class AuthIntegrationTest extends IntegrationTest {

	private static final String EMAIL = "gerant@exemple.test";

	private static final String PASSWORD = "mot-de-passe-de-test";

	@Autowired
	private AdminUserRepository users;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void createAdmin() {
		users.save(new AdminUser(EMAIL, passwordEncoder.encode(PASSWORD)));
	}

	private ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/login").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
	}

	private MockHttpSession session() throws Exception {
		MvcResult result = login(EMAIL, PASSWORD).andExpect(status().isOk()).andReturn();
		return (MockHttpSession) result.getRequest().getSession(false);
	}

	@Test
	void passwordIsStoredHashedWithBcrypt() {
		String hash = users.findByEmail(EMAIL).orElseThrow().getPasswordHash();
		assertThat(hash).startsWith("$2").doesNotContain(PASSWORD);
	}

	@Test
	void loginOpensASessionThatGrantsAccessToAdminRoutes() throws Exception {
		MockHttpSession session = session();
		mvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(EMAIL));
		mvc.perform(get("/api/admin/dashboard").session(session)).andExpect(status().isOk());
	}

	@Test
	void loginIsCaseInsensitiveOnEmail() throws Exception {
		login("  GERANT@Exemple.Test ", PASSWORD).andExpect(status().isOk());
	}

	@Test
	void unknownEmailAndWrongPasswordGiveTheSameAnswer() throws Exception {
		String wrongPassword = login(EMAIL, "mauvais-mot-de-passe").andExpect(status().isUnauthorized())
			.andReturn()
			.getResponse()
			.getContentAsString();
		String unknownEmail = login("inconnu@exemple.test", PASSWORD).andExpect(status().isUnauthorized())
			.andReturn()
			.getResponse()
			.getContentAsString();
		assertThat(com.jayway.jsonpath.JsonPath.<String>read(wrongPassword, "$.message"))
			.isEqualTo(com.jayway.jsonpath.JsonPath.<String>read(unknownEmail, "$.message"));
		assertThat(com.jayway.jsonpath.JsonPath.<String>read(wrongPassword, "$.code")).isEqualTo("INVALID_CREDENTIALS");
	}

	@Test
	void adminRoutesRequireAuthentication() throws Exception {
		mvc.perform(get("/api/admin/dashboard"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
		mvc.perform(get("/api/admin/products")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/admin/contact-requests")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/admin/products").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void writesWithoutCsrfTokenAreRejected() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(EMAIL, PASSWORD)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("CSRF_INVALID"));
		mvc.perform(post("/api/admin/product-categories").session(session())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"Bureaux\"}")).andExpect(status().isForbidden());
	}

	@Test
	void repeatedFailuresAreRateLimitedEvenWithTheRightPassword() throws Exception {
		for (int i = 0; i < 3; i++) {
			login(EMAIL, "mauvais-mot-de-passe").andExpect(status().isUnauthorized());
		}
		login(EMAIL, PASSWORD).andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
	}

	@Test
	void logoutEndsTheSession() throws Exception {
		MockHttpSession session = session();
		mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
		assertThat(session.isInvalid()).isTrue();
	}

	@Test
	void passwordChangeRequiresTheCurrentPassword() throws Exception {
		MockHttpSession session = session();
		mvc.perform(put("/api/auth/password").session(session)
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPassword\":\"faux\",\"newPassword\":\"nouveau-mot-de-passe\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.currentPassword").exists());
		mvc.perform(put("/api/auth/password").session(session)
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPassword\":\"%s\",\"newPassword\":\"court\"}".formatted(PASSWORD)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.newPassword").exists());
		mvc.perform(put("/api/auth/password").session(session)
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPassword\":\"%s\",\"newPassword\":\"nouveau-mot-de-passe\"}".formatted(PASSWORD)))
			.andExpect(status().isNoContent());
		login(EMAIL, PASSWORD).andExpect(status().isUnauthorized());
		login(EMAIL, "nouveau-mot-de-passe").andExpect(status().isOk());
	}

	@Test
	void emailChangeRequiresThePasswordAndUpdatesTheSession() throws Exception {
		MockHttpSession session = session();
		mvc.perform(put("/api/auth/email").session(session)
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"currentPassword\":\"faux\",\"newEmail\":\"nouveau@exemple.test\"}"))
			.andExpect(status().isBadRequest());
		MvcResult changed = mvc
			.perform(put("/api/auth/email").session(session)
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"currentPassword\":\"%s\",\"newEmail\":\"Nouveau@exemple.test\"}".formatted(PASSWORD)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("nouveau@exemple.test"))
			.andReturn();
		MockHttpSession current = (MockHttpSession) changed.getRequest().getSession(false);
		mvc.perform(get("/api/auth/me").session(current)).andExpect(jsonPath("$.email").value("nouveau@exemple.test"));
		login("nouveau@exemple.test", PASSWORD).andExpect(status().isOk());
	}

	@Test
	void thereIsNoPublicRegistrationEndpoint() throws Exception {
		mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isNotFound());
	}

}
