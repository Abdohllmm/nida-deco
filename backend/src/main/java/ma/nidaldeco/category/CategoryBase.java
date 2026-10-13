package ma.nidaldeco.category;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import ma.nidaldeco.common.BaseEntity;

@MappedSuperclass
public abstract class CategoryBase extends BaseEntity {

	@Column(nullable = false, length = 120)
	private String name;

	@Column(nullable = false, unique = true, length = 140)
	private String slug;

	@Column(nullable = false)
	private int position;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public int getPosition() {
		return position;
	}

	public void setPosition(int position) {
		this.position = position;
	}

}
