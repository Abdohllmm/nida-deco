package ma.nidaldeco.demo;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.category.CategoryDto;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.offering.ServiceDtos;
import ma.nidaldeco.offering.ServiceOfferingRepository;
import ma.nidaldeco.offering.ServiceOfferingService;
import ma.nidaldeco.product.Availability;
import ma.nidaldeco.product.ProductCategoryService;
import ma.nidaldeco.product.ProductDtos;
import ma.nidaldeco.product.ProductRepository;
import ma.nidaldeco.product.ProductService;
import ma.nidaldeco.project.ProjectCategoryService;
import ma.nidaldeco.project.ProjectDtos;
import ma.nidaldeco.project.ProjectRepository;
import ma.nidaldeco.project.ProjectService;

/**
 * Jeu de données d'exemple, activé uniquement par le profil « demo » et seulement
 * sur une base sans contenu.
 *
 * Tout est marqué « démonstration ». Les photos sont des visuels d'illustration
 * sous licence libre (voir resources/demo/photos/CREDITS.md) : ce ne sont pas des
 * réalisations de l'entreprise. Les produits et projets sont fictifs et aucun
 * prix n'est attribué. Chaque élément se remplace depuis l'administration.
 */
@Component
@Profile("demo")
public class DemoDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

	private static final String PHOTO_ALT = "Photo d'illustration (démonstration) — ";

	private final ProductRepository products;

	private final ServiceOfferingRepository services;

	private final ProjectRepository projects;

	private final ProductCategoryService productCategories;

	private final ProjectCategoryService projectCategories;

	private final ProductService productService;

	private final ServiceOfferingService serviceService;

	private final ProjectService projectService;

	private final MediaService media;

	/** Une même photo utilisée par plusieurs contenus n'est enregistrée qu'une fois. */
	private final Map<String, UUID> photos = new HashMap<>();

	public DemoDataSeeder(ProductRepository products, ServiceOfferingRepository services, ProjectRepository projects,
			ProductCategoryService productCategories, ProjectCategoryService projectCategories,
			ProductService productService, ServiceOfferingService serviceService, ProjectService projectService,
			MediaService media) {
		this.products = products;
		this.services = services;
		this.projects = projects;
		this.productCategories = productCategories;
		this.projectCategories = projectCategories;
		this.productService = productService;
		this.serviceService = serviceService;
		this.projectService = projectService;
		this.media = media;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (products.count() + services.count() + projects.count() > 0) {
			log.info("Données de démonstration ignorées : la base contient déjà du contenu.");
			return;
		}
		seedServices();
		seedProducts();
		seedProjects();
		log.info("Données de démonstration créées (profil demo).");
	}

	private void seedServices() {
		service(1, "Cuisines modernes", "cuisine moderne",
				"Des cuisines sur mesure, pensées pour être belles et pratiques au quotidien.",
				"Chaque cuisine est conçue selon la configuration de la pièce : rangements, plan de travail, intégration de l'électroménager et finitions.",
				List.of("Conception selon les mesures de la pièce", "Choix des façades et du plan de travail",
						"Rangements et intégration de l'électroménager", "Fabrication et pose"),
				"kitchen-1", "kitchen-2", "kitchen-3", "kitchen-4");
		service(2, "Dressings sur mesure", "dressing",
				"Des dressings qui exploitent chaque centimètre disponible.",
				"Penderies, étagères, tiroirs : l'agencement intérieur est défini selon ce que vous souhaitez ranger et la place disponible.",
				List.of("Agencement intérieur personnalisé", "Portes battantes ou coulissantes", "Fabrication et pose"),
				"dressing-1", "dressing-2");
		service(3, "Placards et rangements", "placard et rangements",
				"Des placards intégrés, adaptés à vos murs et à vos besoins.",
				"Nous réalisons des placards et des rangements sur mesure pour les chambres, les entrées et les espaces à optimiser.",
				List.of("Prise de mesures", "Choix des finitions", "Fabrication et pose"), "placard-1", "placard-2",
				"shelves-1");
		service(4, "Aménagement intérieur", "intérieur aménagé",
				"Un accompagnement complet pour aménager et harmoniser votre intérieur.",
				"Nous étudions votre espace et vos habitudes pour proposer un aménagement cohérent : agencement, matériaux, mobilier et finitions, de l'idée à la réalisation.",
				List.of("Échange sur vos goûts et vos usages", "Proposition d'aménagement",
						"Sélection du mobilier et des finitions", "Coordination de la réalisation"),
				"interior-1", "interior-2", "interior-3", "bedroom-1");
		service(5, "Menuiserie bois", "menuiserie bois", "Portes, meubles et ouvrages en bois réalisés sur mesure.",
				"Nous réalisons des travaux de menuiserie bois adaptés à votre habitat ou à vos locaux.",
				List.of("Portes et habillages", "Meubles sur mesure", "Finitions au choix"), "wood-1", "wood-2",
				"wood-3");
		service(6, "Menuiserie aluminium", "menuiserie aluminium",
				"Fenêtres, baies et ouvrages en aluminium adaptés à vos ouvertures.",
				"Nous réalisons des travaux de menuiserie aluminium sur mesure pour l'habitat et les locaux professionnels.",
				List.of("Fenêtres et baies vitrées", "Portes et cloisons", "Fabrication sur mesure"), "alu-1", "alu-2",
				"alu-3");
	}

	private void service(int order, String title, String subject, String summary, String description,
			List<String> included, String... photoNames) {
		List<UUID> gallery = photos(subject, photoNames);
		serviceService.create(new ServiceDtos.Request(title, null, summary, description, gallery.get(0), gallery,
				included, order, PublicationStatus.PUBLISHED, true, true));
	}

	private void seedProducts() {
		UUID desks = productCategories.create(new CategoryDto.Request("Bureaux", null, 1)).id();
		UUID tables = productCategories.create(new CategoryDto.Request("Tables", null, 2)).id();
		UUID storage = productCategories.create(new CategoryDto.Request("Rangements", null, 3)).id();

		product("Bureau droit (démonstration)", "DEMO-BUR-001", desks, Availability.IN_STOCK, true,
				"Bureau droit au plateau généreux, pour un poste de travail sobre.", "140 × 70 × 75 cm",
				"Panneau mélaminé", List.of("Blanc", "Chêne clair", "Noyer"), "desk-1");
		product("Bureau de direction (démonstration)", "DEMO-BUR-002", desks, Availability.ON_ORDER, true,
				"Bureau en bois avec rangement intégré.", "180 × 90 × 75 cm", "Panneau plaqué bois",
				List.of("Noyer", "Chêne foncé"), "desk-2");
		product("Bureau compact (démonstration)", "DEMO-BUR-003", desks, Availability.IN_STOCK, true,
				"Format compact pour les petits espaces et le télétravail.", "110 × 60 × 75 cm", "Panneau mélaminé",
				List.of("Blanc", "Chêne clair"), "desk-4");
		product("Bureau d'angle (démonstration)", "DEMO-BUR-004", desks, Availability.OUT_OF_STOCK, false,
				"Bureau offrant une grande surface de travail.", "160 × 140 × 75 cm", "Panneau mélaminé",
				List.of("Blanc"), "desk-3");
		product("Table de réunion (démonstration)", "DEMO-TAB-001", tables, Availability.ON_ORDER, true,
				"Table de réunion pour six à huit personnes.", "220 × 100 × 75 cm", "Panneau mélaminé, piètement bois",
				List.of("Blanc", "Chêne clair"), "table-1");
		product("Grande table (démonstration)", "DEMO-TAB-002", tables, Availability.ON_ORDER, false,
				"Grande table pour salle de réunion ou espace partagé.", "300 × 110 × 75 cm", "Panneau plaqué bois",
				List.of("Noir", "Noyer"), "table-2");
		product("Console (démonstration)", "DEMO-TAB-003", tables, Availability.IN_STOCK, false,
				"Console d'appoint à la ligne épurée.", "120 × 40 × 80 cm", "Structure métal, plateau mélaminé",
				List.of("Blanc"), "console-1");
		product("Étagères de rangement (démonstration)", "DEMO-RAN-001", storage, Availability.ON_ORDER, false,
				"Ensemble d'étagères pour cellier, bureau ou dressing.", "Sur mesure", "Panneau mélaminé",
				List.of("Blanc"), "shelves-1");
	}

	private void product(String name, String reference, UUID category, Availability availability, boolean featured,
			String summary, String dimensions, String materials, List<String> colors, String... photoNames) {
		List<UUID> gallery = photos(name, photoNames);
		// Prix volontairement absent : le site affiche « Prix sur demande ».
		productService.create(new ProductDtos.Request(name, null, reference, summary,
				summary + " Cette fiche est un exemple destiné à illustrer le catalogue : la photo est un visuel d'illustration et le contenu doit être remplacé par un produit réel.",
				category, null, availability, dimensions, materials, colors, gallery.get(0), gallery,
				PublicationStatus.PUBLISHED, featured, true));
	}

	private void seedProjects() {
		UUID kitchens = projectCategories.create(new CategoryDto.Request("Cuisines", null, 1)).id();
		UUID dressings = projectCategories.create(new CategoryDto.Request("Dressings et placards", null, 2)).id();
		UUID livingRooms = projectCategories.create(new CategoryDto.Request("Salons", null, 3)).id();
		UUID bedrooms = projectCategories.create(new CategoryDto.Request("Chambres", null, 4)).id();
		UUID offices = projectCategories.create(new CategoryDto.Request("Bureaux", null, 5)).id();

		// Créés du plus ancien au plus récent : le dernier apparaît en premier sur le site.
		project("Espace bureau (démonstration)", offices, "desk-3", "alu-2", "table-1");
		project("Chambre contemporaine (démonstration)", bedrooms, "bedroom-1", "bedroom-2", "bedroom-3");
		project("Placards d'entrée (démonstration)", dressings, "placard-1", "placard-2");
		project("Salon lumineux (démonstration)", livingRooms, "interior-1", "interior-3", "interior-4");
		project("Cuisine blanche avec îlot (démonstration)", kitchens, "kitchen-2", "kitchen-4");
		project("Cuisine contemporaine (démonstration)", kitchens, "kitchen-5", "kitchen-1", "kitchen-3");
	}

	private void project(String title, UUID category, String... photoNames) {
		List<UUID> gallery = photos(title, photoNames);
		projectService.create(new ProjectDtos.Request(title, null, category,
				"Exemple de fiche réalisation. Ce projet est fictif et ses photos sont des visuels d'illustration : il montre la mise en page d'une réalisation et doit être remplacé par un vrai projet de l'entreprise.",
				null, gallery.get(0), gallery, null, null, PublicationStatus.PUBLISHED, true));
		projects.flush();
	}

	private List<UUID> photos(String subject, String... names) {
		return Arrays.stream(names).map(name -> photos.computeIfAbsent(name, key -> store(key, subject))).toList();
	}

	private UUID store(String name, String subject) {
		ClassPathResource resource = new ClassPathResource("demo/photos/" + name + ".jpg");
		try (InputStream in = resource.getInputStream()) {
			return media.store(in.readAllBytes(), "demo-" + name + ".jpg", "image/jpeg", PHOTO_ALT + subject).getId();
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Photo de démonstration introuvable : " + name, ex);
		}
	}

}
