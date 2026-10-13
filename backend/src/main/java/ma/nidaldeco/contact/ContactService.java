package ma.nidaldeco.contact;

import java.time.Clock;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.common.AttemptLimiter;
import ma.nidaldeco.common.PageResponse;
import ma.nidaldeco.common.error.ApiException;
import ma.nidaldeco.config.AppProperties;
import ma.nidaldeco.contact.ContactDtos.Admin;
import ma.nidaldeco.contact.ContactDtos.Create;
import ma.nidaldeco.contact.ContactDtos.Receipt;
import ma.nidaldeco.contact.ContactRequest.Status;

@Service
public class ContactService {

	private final ContactRequestRepository repository;

	/** Freine les envois répétés depuis une même adresse IP. */
	private final AttemptLimiter limiter;

	public ContactService(ContactRequestRepository repository, AppProperties properties) {
		this.repository = repository;
		this.limiter = new AttemptLimiter(properties.security().contactMaxPerWindow(),
				properties.security().contactWindow(), Clock.systemUTC());
	}

	@Transactional
	public Receipt submit(Create request, String clientIp) {
		if (!limiter.tryAcquire(clientIp)) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS",
					"Vous avez envoyé plusieurs demandes en peu de temps. Réessayez plus tard ou contactez-nous sur WhatsApp.");
		}
		String email = request.email() == null || request.email().isBlank() ? null : request.email().trim();
		ContactRequest saved = repository.saveAndFlush(new ContactRequest(request.name().trim(),
				request.phone().trim(), email, request.needType(), request.message().trim(),
				optional(request.location()), optional(request.budget()), Boolean.TRUE.equals(request.consent())));
		return new Receipt(saved.getId(), saved.getCreatedAt());
	}

	@Transactional(readOnly = true)
	public PageResponse<Admin> list(Status status, int page, int size) {
		Pageable pageable = PageResponse.request(page, size, Sort.by("createdAt").descending());
		Page<ContactRequest> result = status == null ? repository.findAll(pageable)
				: repository.findAllByStatus(status, pageable);
		return PageResponse.of(result, Admin::of);
	}

	@Transactional(readOnly = true)
	public Admin get(UUID id) {
		return Admin.of(find(id));
	}

	@Transactional
	public Admin setStatus(UUID id, Status status) {
		ContactRequest request = find(id);
		request.setStatus(status);
		return Admin.of(request);
	}

	@Transactional
	public void delete(UUID id) {
		repository.delete(find(id));
	}

	private static String optional(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	public void resetRateLimit() {
		limiter.clear();
	}

	private ContactRequest find(UUID id) {
		return repository.findById(id).orElseThrow(() -> ApiException.notFound("Demande introuvable."));
	}

}
