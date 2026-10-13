package ma.nidaldeco.offering;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.common.StringListConverter;
import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.offering.ServiceDtos.Detail;
import ma.nidaldeco.offering.ServiceDtos.Request;
import ma.nidaldeco.offering.ServiceDtos.Summary;

@Service
public class ServiceOfferingService {

	private final ServiceOfferingRepository repository;

	private final MediaService media;

	public ServiceOfferingService(ServiceOfferingRepository repository, MediaService media) {
		this.repository = repository;
		this.media = media;
	}

	@Transactional(readOnly = true)
	public List<Summary> listPublished(Boolean featured) {
		return repository.findAllByStatusOrderByDisplayOrderAscTitleAsc(PublicationStatus.PUBLISHED)
			.stream()
			.filter(s -> featured == null || s.isFeatured() == featured)
			.map(Summary::of)
			.toList();
	}

	@Transactional(readOnly = true)
	public Detail getPublished(String slug) {
		return repository.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.map(Detail::of)
			.orElseThrow(() -> ApiException.notFound("Service introuvable."));
	}

	@Transactional(readOnly = true)
	public List<Summary> listAll() {
		return repository.findAllByOrderByDisplayOrderAscTitleAsc().stream().map(Summary::of).toList();
	}

	@Transactional(readOnly = true)
	public Detail get(UUID id) {
		return Detail.of(find(id));
	}

	@Transactional
	public Detail create(Request request) {
		ServiceOffering service = new ServiceOffering();
		apply(service, request);
		return Detail.of(repository.save(service));
	}

	@Transactional
	public Detail update(UUID id, Request request) {
		ServiceOffering service = find(id);
		apply(service, request);
		return Detail.of(service);
	}

	@Transactional
	public Detail setStatus(UUID id, PublicationStatus status) {
		ServiceOffering service = find(id);
		service.setStatus(status);
		return Detail.of(service);
	}

	@Transactional
	public void delete(UUID id) {
		repository.delete(find(id));
	}

	private ServiceOffering find(UUID id) {
		return repository.findById(id).orElseThrow(() -> ApiException.notFound("Service introuvable."));
	}

	private void apply(ServiceOffering service, Request request) {
		String title = request.title().trim();
		String slug = Slugs.resolve(request.slug(), title,
				candidate -> !candidate.equals(service.getSlug()) && repository.existsBySlug(candidate));
		if (!slug.equals(service.getSlug()) && repository.existsBySlug(slug)) {
			throw ApiException.field(HttpStatus.CONFLICT, "slug", "Ce slug est déjà utilisé par un autre service.");
		}
		service.setTitle(title);
		service.setSlug(slug);
		service.setShortDescription(request.shortDescription() == null ? "" : request.shortDescription().trim());
		service.setDescription(request.description() == null ? "" : request.description().trim());
		service.setMainImage(media.resolve(request.mainImageId(), "mainImageId"));
		service.setGallery(media.resolveAll(request.galleryIds(), "galleryIds"));
		service.setIncludedItems(StringListConverter.clean(request.includedItems()));
		service.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());
		service.setStatus(request.status());
		service.setFeatured(Boolean.TRUE.equals(request.featured()));
		service.setDemo(Boolean.TRUE.equals(request.demo()));
	}

}
