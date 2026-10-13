package ma.nidaldeco.contact;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRequestRepository extends JpaRepository<ContactRequest, UUID> {

	Page<ContactRequest> findAllByStatus(ContactRequest.Status status, Pageable pageable);

	List<ContactRequest> findTop5ByOrderByCreatedAtDesc();

	long countByStatus(ContactRequest.Status status);

}
