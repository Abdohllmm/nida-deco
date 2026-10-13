package ma.nidaldeco;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class ContactAndSettingsIntegrationTest extends IntegrationTest {

	private static final String VALID = """
			{"name":"Client Test","phone":"06 12 34 56 78","email":"","needType":"CUISINE",
			 "message":"Bonjour, je souhaite un devis pour une cuisine.",
			 "location":"Maârif","budget":"","consent":true}
			""";

	private ResultActions submit(String json) throws Exception {
		return mvc.perform(post("/api/public/contact-requests").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(json));
	}

	@Test
	void invalidContactRequestIsRejectedWithPreciseErrors() throws Exception {
		submit("{\"name\":\"\",\"phone\":\"abc\",\"email\":\"pas-un-email\",\"message\":\"court\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.name").exists())
			.andExpect(jsonPath("$.fieldErrors.phone").exists())
			.andExpect(jsonPath("$.fieldErrors.email").exists())
			.andExpect(jsonPath("$.fieldErrors.needType").exists())
			.andExpect(jsonPath("$.fieldErrors.message").exists())
			.andExpect(jsonPath("$.fieldErrors.consent").exists());
		// Sans consentement explicite, la demande est refusée.
		submit(VALID.replace("\"consent\":true", "\"consent\":false")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.consent").exists());
		mvc.perform(get("/api/admin/contact-requests").with(admin())).andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void contactRequestIsStoredAndManagedByTheAdministrator() throws Exception {
		String id = id(submit(VALID).andExpect(status().isCreated())
			.andExpect(jsonPath("$.createdAt").exists())
			.andExpect(jsonPath("$.name").doesNotExist())
			.andReturn());

		mvc.perform(get("/api/admin/contact-requests").with(admin()))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].status").value("NEW"))
			.andExpect(jsonPath("$.items[0].location").value("Maârif"))
			.andExpect(jsonPath("$.items[0].budget").doesNotExist())
			.andExpect(jsonPath("$.items[0].consent").value(true))
			.andExpect(jsonPath("$.items[0].email").doesNotExist());
		mvc.perform(get("/api/admin/dashboard").with(admin()))
			.andExpect(jsonPath("$.contactRequests").value(1))
			.andExpect(jsonPath("$.newContactRequests").value(1))
			.andExpect(jsonPath("$.demoItems").value(0))
			.andExpect(jsonPath("$.latestRequests", hasSize(1)));

		mvc.perform(patch("/api/admin/contact-requests/" + id + "/status").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"IN_PROGRESS\"}")).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
		mvc.perform(get("/api/admin/contact-requests").param("status", "NEW").with(admin()))
			.andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/admin/contact-requests").param("status", "IN_PROGRESS").with(admin()))
			.andExpect(jsonPath("$.totalItems").value(1));

		mvc.perform(delete("/api/admin/contact-requests/" + id).with(admin()).with(csrf()))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/admin/contact-requests/" + id).with(admin())).andExpect(status().isNotFound());
	}

	@Test
	void contactRequestsCannotBeReadAnonymously() throws Exception {
		submit(VALID).andExpect(status().isCreated());
		mvc.perform(get("/api/admin/contact-requests")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/public/contact-requests")).andExpect(status().is4xxClientError());
	}

	@Test
	void contactFormIsRateLimitedPerAddress() throws Exception {
		for (int i = 0; i < 3; i++) {
			submit(VALID).andExpect(status().isCreated());
		}
		submit(VALID).andExpect(status().isTooManyRequests());
	}

	@Test
	void settingsArePublicButOnlyEditableByTheAdministrator() throws Exception {
		mvc.perform(get("/api/public/settings"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.displayName").value("NIDAL DECO"))
			.andExpect(jsonPath("$.whatsappNumber").value("212661568771"))
			.andExpect(jsonPath("$.secondaryPhone").value("0653878201"))
			.andExpect(jsonPath("$.secondaryWhatsappNumber").value("212653878201"))
			.andExpect(jsonPath("$.city").value("Casablanca"))
			.andExpect(jsonPath("$.address").value(""));

		String update = """
				{"displayName":"NIDAL DECO","phone":"0661568771","whatsappNumber":"%s",
				 "instagramUrl":"https://www.instagram.com/nidal_deco1/","contactEmail":"","city":"Casablanca",
				 "address":"","openingHours":"","aboutText":"Texte","heroTitle":"Titre","heroSubtitle":"Sous-titre",
				 "introTitle":"Intro","introText":"Texte"}
				""";
		mvc.perform(put("/api/admin/settings").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(update.formatted("212600000000"))).andExpect(status().isUnauthorized());
		mvc.perform(put("/api/admin/settings").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(update.formatted("+212 6 00"))).andExpect(jsonPath("$.fieldErrors.whatsappNumber").exists());
		mvc.perform(put("/api/admin/settings").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(update.formatted("212600000000"))).andExpect(status().isOk());
		mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.whatsappNumber").value("212600000000"));
		// Le second numéro est facultatif : absent de la mise à jour, il est vidé ; invalide, il est refusé.
		mvc.perform(get("/api/public/settings")).andExpect(jsonPath("$.secondaryWhatsappNumber").value(""));
		mvc.perform(put("/api/admin/settings").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(update.formatted("212600000000")
				.replace("\"city\"", "\"secondaryWhatsappNumber\":\"06 53\",\"city\"")))
			.andExpect(jsonPath("$.fieldErrors.secondaryWhatsappNumber").exists());
		jdbc.update("update company_settings set whatsapp_number = '212661568771', secondary_phone = '0653878201', "
				+ "secondary_whatsapp_number = '212653878201'");
	}

	@Test
	void sitemapListsOnlyPublishedContentAndRobotsHidesAdmin() throws Exception {
		String category = createProductCategory("Bureaux");
		createProduct("Bureau visible", "BUR-600", category, "PUBLISHED");
		createProduct("Bureau masqué", "BUR-601", category, "DRAFT");

		mvc.perform(get("/sitemap.xml"))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("https://exemple.test/produits/bureau-visible")))
			.andExpect(content().string(not(containsString("bureau-masque"))))
			.andExpect(content().string(not(containsString("/admin"))));
		mvc.perform(get("/robots.txt"))
			.andExpect(content().string(containsString("Disallow: /admin")))
			.andExpect(content().string(containsString("Sitemap: https://exemple.test/sitemap.xml")));
	}

}
