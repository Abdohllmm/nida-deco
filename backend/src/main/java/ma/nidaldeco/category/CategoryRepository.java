package ma.nidaldeco.category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface CategoryRepository<C extends CategoryBase> extends JpaRepository<C, UUID> {

	Optional<C> findBySlug(String slug);

	boolean existsBySlug(String slug);

	List<C> findAllByOrderByPositionAscNameAsc();

}
