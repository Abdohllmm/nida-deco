package ma.nidaldeco.project;

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
import ma.nidaldeco.project.ProjectDtos.Detail;
import ma.nidaldeco.project.ProjectDtos.Request;
import ma.nidaldeco.project.ProjectDtos.StatusUpdate;
import ma.nidaldeco.project.ProjectDtos.Summary;

public final class ProjectControllers {

	private ProjectControllers() {
	}

	/** Réalisations publiques : uniquement les projets publiés. */
	@RestController
	@RequestMapping("/api/public")
	public static class Public {

		private final ProjectService service;

		private final ProjectCategoryService categories;

		public Public(ProjectService service, ProjectCategoryService categories) {
			this.service = service;
			this.categories = categories;
		}

		@GetMapping("/project-categories")
		List<CategoryDto> categories() {
			return categories.listPublic();
		}

		@GetMapping("/projects")
		PageResponse<Summary> list(@RequestParam(required = false) String category,
				@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "9") int size) {
			return service.search(PublicationStatus.PUBLISHED, category, page, size);
		}

		@GetMapping("/projects/{slug}")
		Detail detail(@PathVariable String slug) {
			return service.getPublished(slug);
		}

	}

	@RestController
	@RequestMapping("/api/admin/projects")
	public static class Admin {

		private final ProjectService service;

		public Admin(ProjectService service) {
			this.service = service;
		}

		@GetMapping
		PageResponse<Summary> list(@RequestParam(required = false) PublicationStatus status,
				@RequestParam(required = false) String category, @RequestParam(defaultValue = "0") int page,
				@RequestParam(defaultValue = "20") int size) {
			return service.search(status, category, page, size);
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

		@DeleteMapping("/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			service.delete(id);
		}

	}

	@RestController
	@RequestMapping("/api/admin/project-categories")
	public static class AdminCategories extends CategoryAdminEndpoints {

		public AdminCategories(ProjectCategoryService service) {
			super(service);
		}

	}

}
