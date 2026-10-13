package ma.nidaldeco.category;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.common.error.ApiException;

/** Logique commune aux catégories de produits et aux types de réalisations. */
public abstract class CategoryService<C extends CategoryBase> {

	private final CategoryRepository<C> repository;

	private final Supplier<C> factory;

	protected CategoryService(CategoryRepository<C> repository, Supplier<C> factory) {
		this.repository = repository;
		this.factory = factory;
	}

	/** Nombre d'éléments (publiés ou non) rattachés à la catégorie. */
	protected abstract long countItems(C category);

	protected abstract void reassignItems(C from, C to);

	@Transactional(readOnly = true)
	public List<CategoryDto> listPublic() {
		return repository.findAllByOrderByPositionAscNameAsc().stream().map(CategoryDto::of).toList();
	}

	@Transactional(readOnly = true)
	public List<CategoryDto> listAdmin() {
		return repository.findAllByOrderByPositionAscNameAsc().stream().map(this::withCount).toList();
	}

	@Transactional
	public CategoryDto create(CategoryDto.Request request) {
		C category = factory.get();
		apply(category, request);
		return withCount(repository.save(category));
	}

	@Transactional
	public CategoryDto update(UUID id, CategoryDto.Request request) {
		C category = get(id);
		apply(category, request);
		return withCount(category);
	}

	/**
	 * Une catégorie encore utilisée n'est supprimée que si une catégorie de
	 * remplacement est explicitement fournie.
	 */
	@Transactional
	public void delete(UUID id, UUID reassignTo) {
		C category = get(id);
		long count = countItems(category);
		if (count > 0) {
			if (reassignTo == null) {
				throw ApiException.conflict("CATEGORY_IN_USE",
						count + " élément" + (count > 1 ? "s utilisent" : " utilise")
								+ " encore cette catégorie. Choisissez une catégorie de remplacement.");
			}
			if (reassignTo.equals(id)) {
				throw ApiException.badRequest("INVALID_REASSIGNMENT",
						"La catégorie de remplacement doit être différente.");
			}
			C target = repository.findById(reassignTo)
				.orElseThrow(() -> ApiException.badRequest("INVALID_REASSIGNMENT",
						"La catégorie de remplacement est introuvable."));
			reassignItems(category, target);
		}
		repository.delete(category);
	}

	@Transactional(readOnly = true)
	public C get(UUID id) {
		return repository.findById(id).orElseThrow(() -> ApiException.notFound("Catégorie introuvable."));
	}

	/** Résout la catégorie désignée par un formulaire d'administration. */
	@Transactional(readOnly = true)
	public C resolve(UUID id) {
		return repository.findById(id)
			.orElseThrow(() -> ApiException.field(HttpStatus.BAD_REQUEST, "categoryId", "Catégorie introuvable."));
	}

	private void apply(C category, CategoryDto.Request request) {
		String name = request.name().trim();
		String slug = Slugs.resolve(request.slug(), name,
				candidate -> !candidate.equals(category.getSlug()) && repository.existsBySlug(candidate));
		if (!slug.equals(category.getSlug()) && repository.existsBySlug(slug)) {
			throw ApiException.field(HttpStatus.CONFLICT, "slug", "Ce slug est déjà utilisé.");
		}
		category.setName(name);
		category.setSlug(slug);
		if (request.position() != null) {
			category.setPosition(request.position());
		}
	}

	private CategoryDto withCount(C category) {
		return new CategoryDto(category.getId(), category.getName(), category.getSlug(), category.getPosition(),
				category.getId() == null ? 0 : countItems(category));
	}

}
