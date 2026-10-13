package ma.nidaldeco.offering;

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
import ma.nidaldeco.offering.ServiceDtos.Detail;
import ma.nidaldeco.offering.ServiceDtos.Request;
import ma.nidaldeco.offering.ServiceDtos.StatusUpdate;
import ma.nidaldeco.offering.ServiceDtos.Summary;

public final class ServiceControllers {

	private ServiceControllers() {
	}

	@RestController
	@RequestMapping("/api/public/services")
	public static class Public {

		private final ServiceOfferingService service;

		public Public(ServiceOfferingService service) {
			this.service = service;
		}

		@GetMapping
		List<Summary> list(@RequestParam(required = false) Boolean featured) {
			return service.listPublished(featured);
		}

		@GetMapping("/{slug}")
		Detail detail(@PathVariable String slug) {
			return service.getPublished(slug);
		}

	}

	@RestController
	@RequestMapping("/api/admin/services")
	public static class Admin {

		private final ServiceOfferingService service;

		public Admin(ServiceOfferingService service) {
			this.service = service;
		}

		@GetMapping
		List<Summary> list() {
			return service.listAll();
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

}
