package ma.nidaldeco.media;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.nidaldeco.common.BaseEntity;

@Entity
@Table(name = "media_assets")
public class MediaAsset extends BaseEntity {

	@Column(nullable = false, unique = true, length = 80)
	private String filename;

	private String originalName;

	@Column(nullable = false, length = 50)
	private String contentType;

	@Column(nullable = false)
	private long sizeBytes;

	private Integer width;

	private Integer height;

	@Column(nullable = false)
	private String altText = "";

	protected MediaAsset() {
	}

	public MediaAsset(String filename, String originalName, String contentType, long sizeBytes, Integer width,
			Integer height, String altText) {
		this.filename = filename;
		this.originalName = originalName;
		this.contentType = contentType;
		this.sizeBytes = sizeBytes;
		this.width = width;
		this.height = height;
		this.altText = altText == null ? "" : altText;
	}

	public String getFilename() {
		return filename;
	}

	public String getOriginalName() {
		return originalName;
	}

	public String getContentType() {
		return contentType;
	}

	public long getSizeBytes() {
		return sizeBytes;
	}

	public Integer getWidth() {
		return width;
	}

	public Integer getHeight() {
		return height;
	}

	public String getAltText() {
		return altText;
	}

	public void setAltText(String altText) {
		this.altText = altText == null ? "" : altText;
	}

}
