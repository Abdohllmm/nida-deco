package ma.nidaldeco.offering;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import ma.nidaldeco.common.PublicationStatus;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, UUID> {

	@EntityGraph(attributePaths = "mainImage")
	List<ServiceOffering> findAllByStatusOrderByDisplayOrderAscTitleAsc(PublicationStatus status);

	@EntityGraph(attributePaths = "mainImage")
	List<ServiceOffering> findAllByOrderByDisplayOrderAscTitleAsc();

	Optional<ServiceOffering> findBySlugAndStatus(String slug, PublicationStatus status);

	boolean existsBySlug(String slug);

	long countByDemoTrue();

}
