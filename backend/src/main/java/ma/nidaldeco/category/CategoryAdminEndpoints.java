package ma.nidaldeco.category;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;

import jakarta.validation.Valid;

/** Points d'accès d'administration partagés par les deux familles de catégories. */
public abstract class CategoryAdminEndpoints {

	private final CategoryService<?> service;

	protected CategoryAdminEndpoints(CategoryService<?> service) {
		this.service = service;
	}

	@GetMapping
	public List<CategoryDto> list() {
		return service.listAdmin();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CategoryDto create(@Valid @RequestBody CategoryDto.Request request) {
		return service.create(request);
	}

	@PutMapping("/{id}")
	public CategoryDto update(@PathVariable UUID id, @Valid @RequestBody CategoryDto.Request request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID id, @RequestParam(required = false) UUID reassignTo) {
		service.delete(id, reassignTo);
	}

}
