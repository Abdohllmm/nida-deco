package ma.nidaldeco.seo;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.HtmlUtils;

import ma.nidaldeco.config.AppProperties;

/**
 * Sert robots.txt, sitemap.xml et — lorsque le build React est configuré — la
 * page index.html de chaque route publique, avec ses métadonnées (titre,
 * description, Open Graph) déjà présentes dans le HTML.
 *
 * Ce n'est pas du rendu côté serveur : le contenu de la page reste produit par
 * React dans le navigateur. Seul l'en-tête du document est renseigné ici, ce qui
 * suffit aux aperçus de liens (WhatsApp, réseaux sociaux) qui n'exécutent pas
 * JavaScript.
 */
@RestController
public class SeoController {

	static final String META_START = "<!--app-meta:start-->";

	static final String META_END = "<!--app-meta:end-->";

	/**
	 * Premier segment d'une « page inconnue ». Les préfixes du backend (api, media,
	 * assets, actuator) n'y entrent jamais ; admin non plus, car /admin/** a sa propre
	 * route et doit répondre 200 quelle que soit la profondeur de l'adresse.
	 */
	private static final String PAGE_SEGMENT = "^(?!api$|media$|assets$|actuator$|admin$)[^.]+$";

	private final SeoService seo;

	private final AppProperties properties;

	public SeoController(SeoService seo, AppProperties properties) {
		this.seo = seo;
		this.properties = properties;
	}

	@GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
	String robots() {
		return "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: " + baseUrl() + "/sitemap.xml\n";
	}

	@GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
	String sitemap() {
		return seo.sitemap(baseUrl());
	}

	@GetMapping("/")
	ResponseEntity<String> home() {
		return render(seo.home(), "/");
	}

	@GetMapping("/services")
	ResponseEntity<String> services() {
		return render(PageMeta.page("Nos services",
				"Décoration intérieure, aménagement clé en main, cuisines, dressings, placards et menuiserie à Casablanca."),
				"/services");
	}

	@GetMapping("/services/{slug}")
	ResponseEntity<String> service(@PathVariable String slug) {
		return render(seo.service(slug), "/services/" + slug);
	}

	@GetMapping("/produits")
	ResponseEntity<String> products() {
		return render(PageMeta.page("Nos produits", "Découvrez le mobilier proposé à la vente par NIDAL DECO."),
				"/produits");
	}

	@GetMapping("/produits/{slug}")
	ResponseEntity<String> product(@PathVariable String slug) {
		return render(seo.product(slug), "/produits/" + slug);
	}

	@GetMapping("/realisations")
	ResponseEntity<String> projects() {
		return render(PageMeta.page("Nos réalisations", "Aperçu des projets réalisés par NIDAL DECO."),
				"/realisations");
	}

	@GetMapping("/realisations/{slug}")
	ResponseEntity<String> project(@PathVariable String slug) {
		return render(seo.project(slug), "/realisations/" + slug);
	}

	@GetMapping("/a-propos")
	ResponseEntity<String> about() {
		return render(PageMeta.page("À propos", "Présentation de NIDAL DECO, entreprise basée à Casablanca."),
				"/a-propos");
	}

	@GetMapping("/contact")
	ResponseEntity<String> contact() {
		return render(PageMeta.page("Contact", "Contactez NIDAL DECO à Casablanca par téléphone, WhatsApp ou formulaire."),
				"/contact");
	}

	@GetMapping("/politique-de-confidentialite")
	ResponseEntity<String> privacy() {
		return render(PageMeta.hidden("Politique de confidentialité"), "/politique-de-confidentialite");
	}

	@GetMapping("/mentions-legales")
	ResponseEntity<String> legal() {
		return render(PageMeta.hidden("Mentions légales"), "/mentions-legales");
	}

	@GetMapping({ "/admin", "/admin/**" })
	ResponseEntity<String> admin() {
		return render(PageMeta.admin(), "/admin");
	}

	/**
	 * Toute autre adresse dont aucun segment ne porte d'extension : l'application
	 * React affiche sa page 404. Les fichiers (images, polices, scripts…) ne sont
	 * pas concernés et restent servis par le gestionnaire de ressources statiques.
	 */
	@GetMapping({ "/{first:" + PAGE_SEGMENT + "}", "/{first:" + PAGE_SEGMENT + "}/{second:[^.]+}",
			"/{first:" + PAGE_SEGMENT + "}/{second:[^.]+}/{third:[^.]+}" })
	ResponseEntity<String> unknown() {
		return render(PageMeta.notFound(), null);
	}

	private ResponseEntity<String> render(PageMeta meta, String path) {
		String template = template();
		if (template == null) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
				.body("Interface web non déployée sur ce serveur (FRONTEND_DIST_DIR non configuré). "
						+ "En développement, utilisez le serveur Vite.");
		}
		int start = template.indexOf(META_START);
		int end = template.indexOf(META_END);
		String html = start < 0 || end < start ? template
				: template.substring(0, start) + head(meta, path) + template.substring(end + META_END.length());
		ResponseEntity.BodyBuilder response = ResponseEntity.status(meta.found() ? HttpStatus.OK : HttpStatus.NOT_FOUND)
			.contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
			.cacheControl(CacheControl.noCache());
		if (!meta.indexable()) {
			response.header("X-Robots-Tag", "noindex, nofollow");
		}
		return response.body(html);
	}

	private String head(PageMeta meta, String path) {
		String siteName = seo.siteName();
		String base = baseUrl();
		String title = meta.title().isBlank() ? siteName : meta.title() + " — " + siteName;
		StringBuilder head = new StringBuilder();
		head.append("<title>").append(esc(title)).append("</title>\n");
		tag(head, "name", "description", meta.description());
		tag(head, "name", "robots", meta.indexable() ? "index, follow" : "noindex, nofollow");
		tag(head, "property", "og:site_name", siteName);
		tag(head, "property", "og:locale", "fr_MA");
		tag(head, "property", "og:type", meta.type());
		tag(head, "property", "og:title", title);
		tag(head, "property", "og:description", meta.description());
		tag(head, "property", "og:image", base + (meta.imagePath() != null ? meta.imagePath() : "/logo.png"));
		tag(head, "name", "twitter:card", meta.imagePath() != null ? "summary_large_image" : "summary");
		if (path != null && meta.indexable()) {
			tag(head, "property", "og:url", base + path);
			head.append("    <link rel=\"canonical\" href=\"").append(esc(base + path)).append("\">\n");
		}
		return head.toString();
	}

	private static void tag(StringBuilder head, String attribute, String key, String content) {
		if (content != null && !content.isBlank()) {
			head.append("    <meta ")
				.append(attribute)
				.append("=\"")
				.append(key)
				.append("\" content=\"")
				.append(esc(content))
				.append("\">\n");
		}
	}

	private static String esc(String value) {
		return HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
	}

	/** Relu à chaque requête : le fichier est petit et peut changer à chaque déploiement. */
	private String template() {
		String dir = properties.frontend().distDir();
		if (dir == null || dir.isBlank()) {
			return null;
		}
		Path index = Path.of(dir).toAbsolutePath().normalize().resolve("index.html");
		try {
			return Files.isRegularFile(index) ? Files.readString(index, StandardCharsets.UTF_8) : null;
		}
		catch (IOException ex) {
			return null;
		}
	}

	private String baseUrl() {
		String configured = properties.publicBaseUrl();
		if (configured != null && !configured.isBlank()) {
			return configured.replaceAll("/+$", "");
		}
		return ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
	}

}
