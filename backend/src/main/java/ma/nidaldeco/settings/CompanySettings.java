package ma.nidaldeco.settings;

import java.time.Instant;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import ma.nidaldeco.media.MediaAsset;

/** Ligne unique (id = 1) créée par la migration initiale. */
@Entity
@Table(name = "company_settings")
public class CompanySettings {

	public static final short SINGLETON_ID = 1;

	@Id
	private Short id;

	@Column(nullable = false, length = 120)
	String displayName;

	@Column(nullable = false, length = 30)
	String phone;

	@Column(nullable = false, length = 20)
	String whatsappNumber;

	/** Second numéro, facultatif (chaîne vide si absent). */
	@Column(nullable = false, length = 30)
	String secondaryPhone = "";

	@Column(nullable = false, length = 20)
	String secondaryWhatsappNumber = "";

	@Column(nullable = false)
	String instagramUrl;

	@Column(nullable = false, length = 254)
	String contactEmail;

	@Column(nullable = false, length = 120)
	String city;

	@Column(nullable = false, length = 300)
	String address;

	@Column(nullable = false, length = 500)
	String openingHours;

	@Column(nullable = false, columnDefinition = "text")
	String aboutText;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "logo_id")
	MediaAsset logo;

	@Column(nullable = false, length = 200)
	String heroTitle;

	@Column(nullable = false, length = 500)
	String heroSubtitle;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "hero_image_id")
	MediaAsset heroImage;

	@Column(nullable = false, length = 200)
	String introTitle;

	@Column(nullable = false, columnDefinition = "text")
	String introText;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	protected CompanySettings() {
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public String getDisplayName() {
		return displayName;
	}

	public String getAboutText() {
		return aboutText;
	}

	public String getHeroSubtitle() {
		return heroSubtitle;
	}

	public MediaAsset getLogo() {
		return logo;
	}

	public MediaAsset getHeroImage() {
		return heroImage;
	}

}
