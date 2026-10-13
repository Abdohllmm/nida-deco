package ma.nidaldeco.product;

import java.math.BigDecimal;
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

@Entity
@Table(name = "products")
public class Product extends BaseEntity {

	@Column(nullable = false, length = 180)
	private String name;

	@Column(nullable = false, unique = true, length = 200)
	private String slug;

	@Column(nullable = false, unique = true, length = 60)
	private String reference;

	@Column(nullable = false, length = 300)
	private String shortDescription = "";

	@Column(nullable = false, columnDefinition = "text")
	private String description = "";

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private ProductCategory category;

	/** Absent = « prix sur demande ». Jamais zéro. */
	@Column(precision = 12, scale = 2)
	private BigDecimal price;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Availability availability = Availability.ON_ORDER;

	@Column(length = 200)
	private String dimensions;

	@Column(length = 300)
	private String materials;

	@Convert(converter = StringListConverter.class)
	@Column(columnDefinition = "text")
	private List<String> colorOptions = new ArrayList<>();

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "main_image_id")
	private MediaAsset mainImage;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"),
			inverseJoinColumns = @JoinColumn(name = "media_id"))
	@OrderColumn(name = "position")
	private List<MediaAsset> gallery = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PublicationStatus status = PublicationStatus.DRAFT;

	@Column(nullable = false)
	private boolean featured;

	/** Contenu d'exemple, signalé comme tel sur le site. */
	@Column(nullable = false)
	private boolean demo;

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

	public String getReference() {
		return reference;
	}

	public void setReference(String reference) {
		this.reference = reference;
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

	public ProductCategory getCategory() {
		return category;
	}

	public void setCategory(ProductCategory category) {
		this.category = category;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public void setPrice(BigDecimal price) {
		this.price = price;
	}

	public Availability getAvailability() {
		return availability;
	}

	public void setAvailability(Availability availability) {
		this.availability = availability;
	}

	public String getDimensions() {
		return dimensions;
	}

	public void setDimensions(String dimensions) {
		this.dimensions = dimensions;
	}

	public String getMaterials() {
		return materials;
	}

	public void setMaterials(String materials) {
		this.materials = materials;
	}

	public List<String> getColorOptions() {
		return colorOptions;
	}

	public void setColorOptions(List<String> colorOptions) {
		this.colorOptions = new ArrayList<>(colorOptions);
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
