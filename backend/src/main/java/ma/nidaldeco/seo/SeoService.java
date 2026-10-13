package ma.nidaldeco.seo;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.function.Function;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.media.MediaAsset;
import ma.nidaldeco.offering.ServiceOfferingRepository;
import ma.nidaldeco.product.ProductRepository;
import ma.nidaldeco.project.ProjectRepository;
import ma.nidaldeco.settings.CompanySettings;
import ma.nidaldeco.settings.CompanySettingsRepository;

/** Métadonnées et plan du site, construits à partir des contenus publiés uniquement. */
@Service
public class SeoService {

	private static final DateTimeFormatter DAY = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);

	private final CompanySettingsRepository settings;

	private final ServiceOfferingRepository services;

	private final ProductRepository products;

	private final ProjectRepository projects;

	public SeoService(CompanySettingsRepository settings, ServiceOfferingRepository services,
			ProductRepository products, ProjectRepository projects) {
		this.settings = settings;
		this.services = services;
		this.products = products;
		this.projects = projects;
	}

	@Transactional(readOnly = true)
	public String siteName() {
		return settings.findById(CompanySettings.SINGLETON_ID).map(CompanySettings::getDisplayName).orElse("NIDAL DECO");
	}

	@Transactional(readOnly = true)
	public PageMeta home() {
		CompanySettings s = settings.findById(CompanySettings.SINGLETON_ID).orElse(null);
		String description = s == null ? "" : s.getHeroSubtitle();
		return PageMeta.content("Décoration intérieure, sur-mesure et mobilier à Casablanca", description,
				s == null ? null : path(s.getHeroImage()), "website");
	}

	@Transactional(readOnly = true)
	public PageMeta service(String slug) {
		return services.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.map(s -> PageMeta.content(s.getTitle(), s.getShortDescription(), path(s.getMainImage()), "article"))
			.orElseGet(PageMeta::notFound);
	}

	@Transactional(readOnly = true)
	public PageMeta product(String slug) {
		return products.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.map(p -> PageMeta.content(p.getName(), p.getShortDescription(), path(p.getMainImage()), "product"))
			.orElseGet(PageMeta::notFound);
	}

	@Transactional(readOnly = true)
	public PageMeta project(String slug) {
		return projects.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.map(p -> PageMeta.content(p.getTitle(), excerpt(p.getDescription()), path(p.getMainImage()), "article"))
			.orElseGet(PageMeta::notFound);
	}

	@Transactional(readOnly = true)
	public String sitemap(String baseUrl) {
		StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
			.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
		for (String path : new String[] { "/", "/services", "/produits", "/realisations", "/a-propos", "/contact" }) {
			url(xml, baseUrl + path, null);
		}
		append(xml, baseUrl + "/services/",
				services.findAllByStatusOrderByDisplayOrderAscTitleAsc(PublicationStatus.PUBLISHED), s -> s.getSlug(),
				s -> s.getUpdatedAt());
		append(xml, baseUrl + "/produits/", products.findAllByStatus(PublicationStatus.PUBLISHED), p -> p.getSlug(),
				p -> p.getUpdatedAt());
		append(xml, baseUrl + "/realisations/", projects.findAllByStatus(PublicationStatus.PUBLISHED),
				p -> p.getSlug(), p -> p.getUpdatedAt());
		return xml.append("</urlset>\n").toString();
	}

	private static <T> void append(StringBuilder xml, String prefix, Iterable<T> items, Function<T, String> slug,
			Function<T, Instant> updatedAt) {
		for (T item : items) {
			url(xml, prefix + slug.apply(item), updatedAt.apply(item));
		}
	}

	private static void url(StringBuilder xml, String location, Instant lastModified) {
		xml.append("  <url><loc>").append(HtmlUtils.htmlEscape(location)).append("</loc>");
		if (lastModified != null) {
			xml.append("<lastmod>").append(DAY.format(lastModified)).append("</lastmod>");
		}
		xml.append("</url>\n");
	}

	private static String path(MediaAsset asset) {
		return asset == null ? null : "/media/" + asset.getFilename();
	}

	private static String excerpt(String text) {
		String flat = text == null ? "" : text.replaceAll("\\s+", " ").trim();
		return flat.length() <= 160 ? flat : flat.substring(0, 157).trim() + "…";
	}

}
