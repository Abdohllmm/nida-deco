package ma.nidaldeco.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ma.nidaldeco.common.PublicationStatus;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

	@EntityGraph(attributePaths = { "category", "mainImage" })
	@Query("""
			select p from Project p
			where (:status is null or p.status = :status)
			  and (:categorySlug is null or p.category.slug = :categorySlug)
			""")
	Page<Project> search(@Param("status") PublicationStatus status, @Param("categorySlug") String categorySlug,
			Pageable pageable);

	Optional<Project> findBySlugAndStatus(String slug, PublicationStatus status);

	List<Project> findAllByStatus(PublicationStatus status);

	boolean existsBySlug(String slug);

	long countByDemoTrue();

	long countByCategory(ProjectCategory category);

	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update Project p set p.category = :to where p.category = :from")
	void reassignCategory(@Param("from") ProjectCategory from, @Param("to") ProjectCategory to);

}
