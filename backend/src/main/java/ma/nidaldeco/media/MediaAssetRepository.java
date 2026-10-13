package ma.nidaldeco.media;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {

	/** Nombre d'emplacements (contenus et paramètres) qui référencent encore ce média. */
	@Query(nativeQuery = true, value = """
			select (select count(*) from products where main_image_id = :id)
			     + (select count(*) from product_images where media_id = :id)
			     + (select count(*) from services where main_image_id = :id)
			     + (select count(*) from service_images where media_id = :id)
			     + (select count(*) from projects where main_image_id = :id or before_image_id = :id or after_image_id = :id)
			     + (select count(*) from project_images where media_id = :id)
			     + (select count(*) from company_settings where logo_id = :id or hero_image_id = :id)
			""")
	long countUsages(@Param("id") UUID id);

}
