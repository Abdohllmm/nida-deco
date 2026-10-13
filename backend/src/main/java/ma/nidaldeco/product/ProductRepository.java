package ma.nidaldeco.product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ma.nidaldeco.common.PublicationStatus;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

	@Override
	@EntityGraph(attributePaths = { "category", "mainImage" })
	Page<Product> findAll(Specification<Product> spec, Pageable pageable);

	Optional<Product> findBySlugAndStatus(String slug, PublicationStatus status);

	@EntityGraph(attributePaths = { "category", "mainImage" })
	List<Product> findTop4ByCategoryAndStatusAndIdNotOrderByCreatedAtDesc(ProductCategory category,
			PublicationStatus status, UUID id);

	List<Product> findAllByStatus(PublicationStatus status);

	boolean existsBySlug(String slug);

	long countByDemoTrue();

	boolean existsByReferenceIgnoreCase(String reference);

	long countByCategory(ProductCategory category);

	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update Product p set p.category = :to where p.category = :from")
	void reassignCategory(@Param("from") ProductCategory from, @Param("to") ProductCategory to);

}
