package ma.nidaldeco.product;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import ma.nidaldeco.category.CategoryAdminEndpoints;
import ma.nidaldeco.category.CategoryDto;
import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.product.ProductDtos.Detail;
import ma.nidaldeco.product.ProductDtos.FeaturedUpdate;
import ma.nidaldeco.product.ProductDtos.PublicDetail;
import ma.nidaldeco.product.ProductDtos.Request;
import ma.nidaldeco.product.ProductDtos.StatusUpdate;
import ma.nidaldeco.product.ProductDtos.Summary;
import ma.nidaldeco.product.ProductService.Filter;
import ma.nidaldeco.product.ProductService.SortOption;

public final class ProductControllers {

	private ProductControllers() {
	}

	/** Catalogue public : uniquement les produits publiés. */
	@RestController
	@RequestMapping("/api/public")
	public static class Public {

		private final ProductService service;

		private final ProductCategoryService categories;

		public Public(ProductService service, ProductCategoryService categories) {
			this.service = service;
			this.categories = categories;
		}

		@GetMapping("/product-categories")
		List<CategoryDto> categories() {
			return categories.listPublic();
		}

		@GetMapping("/products")
		PageResponse<Summary> list(@RequestParam(required = false) String q,
				@RequestParam(required = false) String category,
				@RequestParam(required = false) Availability availability,
				@RequestParam(required = false) Boolean featured,
				@RequestParam(defaultValue = "NEWEST") SortOption sort, @RequestParam(defaultValue = "0") int page,
				@RequestParam(defaultValue = "12") int size) {
			return service.search(new Filter(q, category, availability, PublicationStatus.PUBLISHED, featured, sort),
					page, size);
		}

		@GetMapping("/products/{slug}")
		PublicDetail detail(@PathVariable String slug) {
			return service.getPublished(slug);
		}

	}

	@RestController
	@RequestMapping("/api/admin/products")
	public static class Admin {

		private final ProductService service;

		public Admin(ProductService service) {
			this.service = service;
		}

		@GetMapping
		PageResponse<Summary> list(@RequestParam(required = false) String q,
				@RequestParam(required = false) String category,
				@RequestParam(required = false) PublicationStatus status, @RequestParam(defaultValue = "0") int page,
				@RequestParam(defaultValue = "20") int size) {
			return service.search(new Filter(q, category, null, status, null, SortOption.NEWEST), page, size);
		}

		@GetMapping("/{id}")
		Detail get(@PathVariable UUID id) {
			return service.get(id);
		}

		@PostMapping
		@ResponseStatus(HttpStatus.CREATED)
		Detail create(@Valid @RequestBody Request request) {
			return service.create(request);
		}

		@PutMapping("/{id}")
		Detail update(@PathVariable UUID id, @Valid @RequestBody Request request) {
			return service.update(id, request);
		}

		@PatchMapping("/{id}/status")
		Detail setStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdate request) {
			return service.setStatus(id, request.status());
		}

		@PatchMapping("/{id}/featured")
		Detail setFeatured(@PathVariable UUID id, @Valid @RequestBody FeaturedUpdate request) {
			return service.setFeatured(id, request.featured());
		}

		@DeleteMapping("/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			service.delete(id);
		}

	}

	@RestController
	@RequestMapping("/api/admin/product-categories")
	public static class AdminCategories extends CategoryAdminEndpoints {

		public AdminCategories(ProductCategoryService service) {
			super(service);
		}

	}

}
