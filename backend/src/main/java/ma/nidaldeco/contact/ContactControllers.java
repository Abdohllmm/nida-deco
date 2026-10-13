package ma.nidaldeco.contact;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.contact.ContactDtos.Admin;
import ma.nidaldeco.contact.ContactDtos.Create;
import ma.nidaldeco.contact.ContactDtos.Receipt;
import ma.nidaldeco.contact.ContactDtos.StatusUpdate;
import ma.nidaldeco.contact.ContactRequest.Status;

public final class ContactControllers {

	private ContactControllers() {
	}

	@RestController
	@RequestMapping("/api/public/contact-requests")
	public static class Public {

		private final ContactService service;

		public Public(ContactService service) {
			this.service = service;
		}

		@PostMapping
		@ResponseStatus(HttpStatus.CREATED)
		Receipt submit(@Valid @RequestBody Create request, HttpServletRequest http) {
			return service.submit(request, http.getRemoteAddr());
		}

	}

	@RestController
	@RequestMapping("/api/admin/contact-requests")
	public static class AdminApi {

		private final ContactService service;

		public AdminApi(ContactService service) {
			this.service = service;
		}

		@GetMapping
		PageResponse<Admin> list(@RequestParam(required = false) Status status,
				@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
			return service.list(status, page, size);
		}

		@GetMapping("/{id}")
		Admin get(@PathVariable UUID id) {
			return service.get(id);
		}

		@PatchMapping("/{id}/status")
		Admin setStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdate request) {
			return service.setStatus(id, request.status());
		}

		@DeleteMapping("/{id}")
		@ResponseStatus(HttpStatus.NO_CONTENT)
		void delete(@PathVariable UUID id) {
			service.delete(id);
		}

	}

}
