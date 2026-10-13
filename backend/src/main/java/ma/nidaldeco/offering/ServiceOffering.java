package ma.nidaldeco.offering;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
import ma.nidaldeco.common.StringListConverter;
import ma.nidaldeco.media.MediaAsset;

/** Prestation proposée par l'entreprise (table « services »). */
@Entity
@Table(name = "services")
public class ServiceOffering extends BaseEntity {

	@Column(nullable = false, length = 180)
	private String title;

	@Column(nullable = false, unique = true, length = 200)
	private String slug;

	@Column(nullable = false, length = 300)
	private String shortDescription = "";

	@Column(nullable = false, columnDefinition = "text")
	private String description = "";

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "main_image_id")
	private MediaAsset mainImage;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "service_images", joinColumns = @JoinColumn(name = "service_id"),
			inverseJoinColumns = @JoinColumn(name = "media_id"))
	@OrderColumn(name = "position")
	private List<MediaAsset> gallery = new ArrayList<>();

	@Convert(converter = StringListConverter.class)
	@Column(columnDefinition = "text")
	private List<String> includedItems = new ArrayList<>();

	@Column(nullable = false)
	private int displayOrder;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PublicationStatus status = PublicationStatus.DRAFT;

	@Column(nullable = false)
	private boolean featured;

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

	public String getShortDescription() {
		return shortDescription;
	}

	public void setShortDescription(String shortDescription) {
		this.shortDescription = shortDescription;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
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

	public List<String> getIncludedItems() {
		return includedItems;
	}

	public void setIncludedItems(List<String> includedItems) {
		this.includedItems = new ArrayList<>(includedItems);
	}

	public int getDisplayOrder() {
		return displayOrder;
	}

	public void setDisplayOrder(int displayOrder) {
		this.displayOrder = displayOrder;
	}

	public PublicationStatus getStatus() {
		return status;
	}

	public void setStatus(PublicationStatus status) {
		this.status = status;
	}

	public boolean isFeatured() {
		return featured;
	}

	public void setFeatured(boolean featured) {
		this.featured = featured;
	}

	public boolean isDemo() {
		return demo;
	}

	public void setDemo(boolean demo) {
		this.demo = demo;
	}

}
