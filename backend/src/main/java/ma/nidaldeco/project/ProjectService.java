package ma.nidaldeco.project;

import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.project.ProjectDtos.Detail;
import ma.nidaldeco.project.ProjectDtos.Request;
import ma.nidaldeco.project.ProjectDtos.Summary;

@Service
public class ProjectService {

	private final ProjectRepository projects;

	private final ProjectCategoryService categories;

	private final MediaService media;

	public ProjectService(ProjectRepository projects, ProjectCategoryService categories, MediaService media) {
		this.projects = projects;
		this.categories = categories;
		this.media = media;
	}

	/** status nul = tous les statuts (administration uniquement). */
	@Transactional(readOnly = true)
	public PageResponse<Summary> search(PublicationStatus status, String categorySlug, int page, int size) {
		String slug = categorySlug == null || categorySlug.isBlank() ? null : categorySlug.trim();
		Sort sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
		return PageResponse.of(projects.search(status, slug, PageResponse.request(page, size, sort)), Summary::of);
	}

	@Transactional(readOnly = true)
	public Detail getPublished(String slug) {
		return projects.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.map(Detail::of)
			.orElseThrow(() -> ApiException.notFound("Réalisation introuvable."));
	}

	@Transactional(readOnly = true)
	public Detail get(UUID id) {
		return Detail.of(find(id));
	}

	@Transactional
	public Detail create(Request request) {
		Project project = new Project();
		apply(project, request);
		return Detail.of(projects.save(project));
	}

	@Transactional
	public Detail update(UUID id, Request request) {
		Project project = find(id);
		apply(project, request);
		return Detail.of(project);
	}

	@Transactional
	public Detail setStatus(UUID id, PublicationStatus status) {
		Project project = find(id);
		project.setStatus(status);
		return Detail.of(project);
	}

	@Transactional
	public void delete(UUID id) {
		projects.delete(find(id));
	}

	private Project find(UUID id) {
		return projects.findById(id).orElseThrow(() -> ApiException.notFound("Réalisation introuvable."));
	}

	private void apply(Project project, Request request) {
		String title = request.title().trim();
		String slug = Slugs.resolve(request.slug(), title,
				candidate -> !candidate.equals(project.getSlug()) && projects.existsBySlug(candidate));
		if (!slug.equals(project.getSlug()) && projects.existsBySlug(slug)) {
			throw ApiException.field(HttpStatus.CONFLICT, "slug", "Ce slug est déjà utilisé par une autre réalisation.");
		}
		// Un comparatif avant/après n'a de sens qu'avec les deux images.
		if ((request.beforeImageId() == null) != (request.afterImageId() == null)) {
			throw ApiException.field(HttpStatus.BAD_REQUEST,
					request.beforeImageId() == null ? "beforeImageId" : "afterImageId",
					"Renseignez les deux images « avant » et « après », ou aucune.");
		}
		project.setTitle(title);
		project.setSlug(slug);
		project.setCategory(categories.resolve(request.categoryId()));
		project.setDescription(request.description() == null ? "" : request.description().trim());
		project.setLocation(request.location() == null || request.location().isBlank() ? null : request.location().trim());
		project.setMainImage(media.resolve(request.mainImageId(), "mainImageId"));
		project.setGallery(media.resolveAll(request.galleryIds(), "galleryIds"));
		project.setBeforeImage(media.resolve(request.beforeImageId(), "beforeImageId"));
		project.setAfterImage(media.resolve(request.afterImageId(), "afterImageId"));
		project.setStatus(request.status());
		project.setDemo(Boolean.TRUE.equals(request.demo()));
	}

}
