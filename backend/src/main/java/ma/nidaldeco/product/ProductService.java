package ma.nidaldeco.product;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Nulls;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.common.StringListConverter;
import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.product.ProductDtos.Detail;
import ma.nidaldeco.product.ProductDtos.PublicDetail;
import ma.nidaldeco.product.ProductDtos.Request;
import ma.nidaldeco.product.ProductDtos.Summary;

@Service
public class ProductService {

	public enum SortOption {
		NEWEST, PRICE_ASC, PRICE_DESC
	}

	/** Critères de recherche. status nul = tous les statuts (administration uniquement). */
	public record Filter(String query, String categorySlug, Availability availability, PublicationStatus status,
			Boolean featured, SortOption sort) {
	}

	private final ProductRepository products;

	private final ProductCategoryService categories;

	private final MediaService media;

	public ProductService(ProductRepository products, ProductCategoryService categories,
			MediaService media) {
		this.products = products;
		this.categories = categories;
		this.media = media;
	}

	@Transactional(readOnly = true)
	public PageResponse<Summary> search(Filter filter, int page, int size) {
		// Le tri est porté par la spécification afin de placer les prix absents en dernier.
		return PageResponse.of(products.findAll(specification(filter), PageResponse.request(page, size, Sort.unsorted())),
				Summary::of);
	}

	@Transactional(readOnly = true)
	public PublicDetail getPublished(String slug) {
		Product product = products.findBySlugAndStatus(slug, PublicationStatus.PUBLISHED)
			.orElseThrow(() -> ApiException.notFound("Produit introuvable."));
		List<Summary> similar = products
			.findTop4ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(product.getCategory(), PublicationStatus.PUBLISHED,
					product.getId())
			.stream()
			.map(Summary::of)
			.toList();
		return new PublicDetail(Detail.of(product), similar);
	}

	@Transactional(readOnly = true)
	public Detail get(UUID id) {
		return Detail.of(find(id));
	}

	@Transactional
	public Detail create(Request request) {
		Product product = new Product();
		apply(product, request);
		return Detail.of(products.save(product));
	}

	@Transactional
	public Detail update(UUID id, Request request) {
		Product product = find(id);
		apply(product, request);
		return Detail.of(product);
	}

	@Transactional
	public Detail setStatus(UUID id, PublicationStatus status) {
		Product product = find(id);
		product.setStatus(status);
		return Detail.of(product);
	}

	@Transactional
	public Detail setFeatured(UUID id, boolean featured) {
		Product product = find(id);
		product.setFeatured(featured);
		return Detail.of(product);
	}

	@Transactional
	public void delete(UUID id) {
		products.delete(find(id));
	}

	private Product find(UUID id) {
		return products.findById(id).orElseThrow(() -> ApiException.notFound("Produit introuvable."));
	}

	private void apply(Product product, Request request) {
		String name = request.name().trim();
		String slug = Slugs.resolve(request.slug(), name,
				candidate -> !candidate.equals(product.getSlug()) && products.existsBySlug(candidate));
		if (!slug.equals(product.getSlug()) && products.existsBySlug(slug)) {
			throw ApiException.field(HttpStatus.CONFLICT, "slug", "Ce slug est déjà utilisé par un autre produit.");
		}
		String reference = request.reference().trim();
		if (!reference.equalsIgnoreCase(product.getReference()) && products.existsByReferenceIgnoreCase(reference)) {
			throw ApiException.field(HttpStatus.CONFLICT, "reference",
					"Cette référence est déjà utilisée par un autre produit.");
		}
		product.setName(name);
		product.setSlug(slug);
		product.setReference(reference);
		product.setShortDescription(text(request.shortDescription()));
		product.setDescription(text(request.description()));
		product.setCategory(categories.resolve(request.categoryId()));
		product.setPrice(request.price());
		product.setAvailability(request.availability());
		product.setDimensions(optional(request.dimensions()));
		product.setMaterials(optional(request.materials()));
		product.setColorOptions(StringListConverter.clean(request.colorOptions()));
		product.setMainImage(media.resolve(request.mainImageId(), "mainImageId"));
		product.setGallery(media.resolveAll(request.galleryIds(), "galleryIds"));
		product.setStatus(request.status());
		product.setFeatured(Boolean.TRUE.equals(request.featured()));
		product.setDemo(Boolean.TRUE.equals(request.demo()));
	}

	private static Specification<Product> specification(Filter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), filter.status()));
			}
			if (filter.query() != null && !filter.query().isBlank()) {
				String like = "%" + escapeLike(filter.query().trim().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("name")), like, '\\'),
						cb.like(cb.lower(root.get("reference")), like, '\\'),
						cb.like(cb.lower(root.get("shortDescription")), like, '\\')));
			}
			if (filter.categorySlug() != null && !filter.categorySlug().isBlank()) {
				predicates.add(cb.equal(root.get("category").get("slug"), filter.categorySlug().trim()));
			}
			if (filter.availability() != null) {
				predicates.add(cb.equal(root.get("availability"), filter.availability()));
			}
			if (filter.featured() != null) {
				predicates.add(cb.equal(root.get("featured"), filter.featured()));
			}
			// La requête de comptage (résultat Long) ne doit pas être triée.
			if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
				Order newest = cb.desc(root.get("createdAt"));
				SortOption sort = filter.sort() == null ? SortOption.NEWEST : filter.sort();
				switch (sort) {
					case PRICE_ASC -> query.orderBy(cb.asc(root.get("price"), Nulls.LAST), newest);
					case PRICE_DESC -> query.orderBy(cb.desc(root.get("price"), Nulls.LAST), newest);
					default -> query.orderBy(newest, cb.asc(root.get("id")));
				}
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	private static String text(String value) {
		return value == null ? "" : value.trim();
	}

	private static String optional(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
