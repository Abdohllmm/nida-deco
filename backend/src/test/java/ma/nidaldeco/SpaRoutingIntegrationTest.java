package ma.nidaldeco;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/**
 * Spring Boot sert le build React (FRONTEND_DIST_DIR) : les routes de
 * l'application retombent sur index.html, sans jamais capter l'API, les médias,
 * le sitemap, robots.txt, l'état de santé ni les fichiers statiques.
 */
@TestPropertySource(properties = "app.frontend.dist-dir=target/test-dist")
class SpaRoutingIntegrationTest extends IntegrationTest {

	private static final String SHELL_MARKER = "<div id=\"root\"></div>";

	// Faux build React, créé avant le démarrage du contexte Spring.
	static {
		try {
			Path dist = Path.of("target/test-dist");
			Files.createDirectories(dist.resolve("assets"));
			Files.createDirectories(dist.resolve("images"));
			Files.writeString(dist.resolve("index.html"), """
					<!doctype html><html lang="fr"><head>
					<!--app-meta:start--><title>défaut</title><!--app-meta:end-->
					</head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>
					""");
			Files.writeString(dist.resolve("assets/app.js"), "console.log('app');");
			Files.write(dist.resolve("images/photo.jpg"), new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF });
			Files.write(dist.resolve("logo.png"), png(4, 4));
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	@Test
	void publicRoutesServeTheReactShellWithInjectedMetadata() throws Exception {
		for (String path : new String[] { "/", "/services", "/produits", "/realisations", "/a-propos", "/contact" }) {
			mvc.perform(get(path))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
				.andExpect(content().string(containsString(SHELL_MARKER)))
				.andExpect(content().string(containsString("NIDAL DECO</title>")))
				.andExpect(content().string(containsString("property=\"og:site_name\"")))
				.andExpect(content().string(not(containsString("<title>défaut</title>"))));
		}
	}

	@Test
	void publishedContentGetsItsOwnMetadataAndUnknownContentA404Shell() throws Exception {
		String category = createProductCategory("Bureaux");
		createProduct("Bureau Élégance", "BUR-SPA", category, "PUBLISHED");
		createProduct("Bureau caché", "BUR-SPA-2", category, "DRAFT");

		mvc.perform(get("/produits/bureau-elegance"))
			.andExpect(status().isOk())
			.andExpect(content().string(containsString("<title>Bureau Élégance — NIDAL DECO</title>")))
			.andExpect(content().string(containsString("https://exemple.test/produits/bureau-elegance")))
			.andExpect(content().string(containsString(SHELL_MARKER)));
		// Produit inexistant ou en brouillon : l'application React s'affiche, avec un vrai statut 404.
		for (String path : new String[] { "/produits/mon-produit", "/produits/bureau-cache", "/services/inconnu",
				"/realisations/inconnu" }) {
			mvc.perform(get(path))
				.andExpect(status().isNotFound())
				.andExpect(content().string(containsString(SHELL_MARKER)))
				.andExpect(header().string("X-Robots-Tag", containsString("noindex")));
		}
	}

	@Test
	void adminRoutesServeTheShellOnDirectRefreshAndAreNotIndexed() throws Exception {
		for (String path : new String[] { "/admin", "/admin/login", "/admin/produits", "/admin/produits/nouveau",
				"/admin/realisations/3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70" }) {
			mvc.perform(get(path))
				.andExpect(status().isOk())
				.andExpect(content().string(containsString(SHELL_MARKER)))
				.andExpect(header().string("X-Robots-Tag", containsString("noindex")));
		}
	}

	@Test
	void unknownPagesGetTheShellWith404Status() throws Exception {
		for (String path : new String[] { "/page-inconnue", "/une/page/inconnue" }) {
			mvc.perform(get(path))
				.andExpect(status().isNotFound())
				.andExpect(content().string(containsString(SHELL_MARKER)));
		}
	}

	@Test
	void apiRoutesAreNeverCapturedByTheSpaFallback() throws Exception {
		mvc.perform(get("/api/public/settings"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.displayName").value("NIDAL DECO"));
		for (String path : new String[] { "/api/inconnu", "/api/public/inconnu/chemin", "/api/public/products/absent" }) {
			mvc.perform(get(path))
				.andExpect(status().isNotFound())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(content().string(not(containsString(SHELL_MARKER))));
		}
		mvc.perform(get("/api/admin/products"))
			.andExpect(status().isUnauthorized())
			.andExpect(content().string(not(containsString(SHELL_MARKER))));
	}

	@Test
	void mediaSitemapRobotsAndHealthStayBackendRoutes() throws Exception {
		mvc.perform(get("/media/00000000-0000-0000-0000-000000000000.png"))
			.andExpect(status().isNotFound())
			.andExpect(content().string(not(containsString(SHELL_MARKER))));
		mvc.perform(get("/media/n-importe-quoi"))
			.andExpect(status().isNotFound())
			.andExpect(content().string(not(containsString(SHELL_MARKER))));
		mvc.perform(get("/sitemap.xml"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
			.andExpect(content().string(containsString("<urlset")));
		mvc.perform(get("/robots.txt"))
			.andExpect(status().isOk())
			.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
			.andExpect(content().string(containsString("Disallow: /admin")));
		mvc.perform(get("/actuator/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"))
			.andExpect(jsonPath("$.components").doesNotExist());
		// Rien d'autre qu'Actuator « health » n'est exposé, et rien n'est capté par le repli SPA.
		for (String path : new String[] { "/actuator/env", "/actuator/beans", "/actuator/configprops",
				"/actuator/heapdump", "/actuator/logfile", "/actuator/metrics" }) {
			mvc.perform(get(path))
				.andExpect(status().isNotFound())
				.andExpect(content().string(not(containsString(SHELL_MARKER))));
		}
	}

	@Test
	void uploadedMediaIsServedAsAnImage() throws Exception {
		String id = uploadPng();
		String url = com.jayway.jsonpath.JsonPath.read(
				mvc.perform(get("/api/admin/media").with(admin())).andReturn().getResponse().getContentAsString(),
				"$.items[0].url");
		org.assertj.core.api.Assertions.assertThat(id).isNotBlank();
		mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
	}

	@Test
	void staticFilesAreServedAndMissingFilesAreNotReplacedByTheShell() throws Exception {
		mvc.perform(get("/assets/app.js"))
			.andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", containsString("immutable")))
			.andExpect(content().string(containsString("console.log")));
		mvc.perform(get("/images/photo.jpg")).andExpect(status().isOk());
		mvc.perform(get("/logo.png")).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
		for (String path : new String[] { "/images/absent.jpg", "/assets/absent.js", "/favicon.ico" }) {
			mvc.perform(get(path))
				.andExpect(status().isNotFound())
				.andExpect(content().string(not(containsString(SHELL_MARKER))));
		}
	}

}
