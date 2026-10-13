package ma.nidaldeco.dashboard;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import ma.nidaldeco.contact.ContactDtos;
import ma.nidaldeco.contact.ContactRequest;
import ma.nidaldeco.contact.ContactRequestRepository;
import ma.nidaldeco.offering.ServiceOfferingRepository;
import ma.nidaldeco.product.ProductRepository;
import ma.nidaldeco.project.ProjectRepository;

/**
 * Chiffres réels issus de la base. Aucune statistique de vente : l'ouverture
 * d'une conversation WhatsApp ne dit rien de l'issue d'une commande.
 */
@RestController
public class DashboardController {

	/** demoItems : contenus d'exemple encore présents, à remplacer par des contenus réels. */
	public record Dashboard(long products, long services, long projects, long contactRequests,
			long newContactRequests, long demoItems, List<ContactDtos.Admin> latestRequests) {
	}

	private final ProductRepository products;

	private final ServiceOfferingRepository services;

	private final ProjectRepository projects;

	private final ContactRequestRepository requests;

	public DashboardController(ProductRepository products, ServiceOfferingRepository services,
			ProjectRepository projects, ContactRequestRepository requests) {
		this.products = products;
		this.services = services;
		this.projects = projects;
		this.requests = requests;
	}

	@GetMapping("/api/admin/dashboard")
	@Transactional(readOnly = true)
	public Dashboard dashboard() {
		return new Dashboard(products.count(), services.count(), projects.count(), requests.count(),
				requests.countByStatus(ContactRequest.Status.NEW),
				products.countByDemoTrue() + services.countByDemoTrue() + projects.countByDemoTrue(),
				requests.findTop5ByOrderByCreatedAtDesc().stream().map(ContactDtos.Admin::of).toList());
	}

}
