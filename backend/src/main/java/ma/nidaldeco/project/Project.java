package ma.nidaldeco.project;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import ma.nidaldeco.common.BaseEntity;
import ma.nidaldeco.common.PublicationStatus;
import ma.nidaldeco.media.MediaAsset;

/** Réalisation présentée sur le site. */
@Entity
@Table(name = "projects")
public class Project extends BaseEntity {

	@Column(nullable = false, length = 180)
	private String title;

	@Column(nullable = false, unique = true, length = 200)
	private String slug;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private ProjectCategory category;

	@Column(nullable = false, columnDefinition = "text")
	private String description = "";

	@Column(length = 160)
	private String location;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "main_image_id")
	private MediaAsset mainImage;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "project_images", joinColumns = @JoinColumn(name = "project_id"),
			inverseJoinColumns = @JoinColumn(name = "media_id"))
	@OrderColumn(name = "position")
	private List<MediaAsset> gallery = new ArrayList<>();

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "before_image_id")
	private MediaAsset beforeImage;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "after_image_id")
	private MediaAsset afterImage;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PublicationStatus status = PublicationStatus.DRAFT;

	@Column(nullable = false)
	private boolean demo;

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public ProjectCategory getCategory() {
		return category;
	}

	public void setCategory(ProjectCategory category) {
		this.category = category;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public MediaAsset getMainImage() {
		return mainImage;
	}

	public void setMainImage(MediaAsset mainImage) {
		this.mainImage = mainImage;
	}

	public List<MediaAsset> getGallery() {
		return gallery;
	}

	public void setGallery(List<MediaAsset> gallery) {
		this.gallery.clear();
		this.gallery.addAll(gallery);
	}

	public MediaAsset getBeforeImage() {
		return beforeImage;
	}

	public void setBeforeImage(MediaAsset beforeImage) {
		this.beforeImage = beforeImage;
	}

	public MediaAsset getAfterImage() {
		return afterImage;
	}

	public void setAfterImage(MediaAsset afterImage) {
		this.afterImage = afterImage;
	}

	public PublicationStatus getStatus() {
		return status;
	}

	public void setStatus(PublicationStatus status) {
		this.status = status;
	}

	public boolean isDemo() {
		return demo;
	}

	public void setDemo(boolean demo) {
		this.demo = demo;
	}

}
