package ma.nidaldeco.media;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Optional;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

/**
 * Identifie une image à partir de son contenu réel (signature binaire), sans se
 * fier au nom du fichier ni au type déclaré par le navigateur.
 */
public final class ImageInspector {

	public enum ImageType {

		JPEG("image/jpeg", "jpg"), PNG("image/png", "png"), WEBP("image/webp", "webp");

		private final String contentType;

		private final String extension;

		ImageType(String contentType, String extension) {
			this.contentType = contentType;
			this.extension = extension;
		}

		public String contentType() {
			return contentType;
		}

		public String extension() {
			return extension;
		}

		public static Optional<ImageType> fromContentType(String contentType) {
			for (ImageType type : values()) {
				if (type.contentType.equalsIgnoreCase(contentType)) {
					return Optional.of(type);
				}
			}
			return Optional.empty();
		}

		public static Optional<ImageType> fromExtension(String extension) {
			for (ImageType type : values()) {
				if (type.extension.equals(extension)) {
					return Optional.of(type);
				}
			}
			return Optional.empty();
		}

	}

	public record ImageInfo(ImageType type, int width, int height) {
	}

	private static final int MAX_DIMENSION = 12_000;

	private ImageInspector() {
	}

	/** Renvoie les caractéristiques de l'image, ou vide si le contenu n'est pas un JPEG, PNG ou WebP valide. */
	public static Optional<ImageInfo> inspect(byte[] data) {
		Optional<ImageInfo> info = Optional.empty();
		if (startsWith(data, 0xFF, 0xD8, 0xFF)) {
			info = readWithImageIo(data, ImageType.JPEG, "jpeg");
		}
		else if (startsWith(data, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
			info = readWithImageIo(data, ImageType.PNG, "png");
		}
		else if (data.length >= 30 && ascii(data, 0, "RIFF") && ascii(data, 8, "WEBP")) {
			info = readWebp(data);
		}
		return info.filter(i -> i.width() > 0 && i.height() > 0 && i.width() <= MAX_DIMENSION
				&& i.height() <= MAX_DIMENSION);
	}

	private static Optional<ImageInfo> readWithImageIo(byte[] data, ImageType type, String formatName) {
		Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(formatName);
		if (!readers.hasNext()) {
			return Optional.empty();
		}
		ImageReader reader = readers.next();
		try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
			reader.setInput(in, true, true);
			return Optional.of(new ImageInfo(type, reader.getWidth(0), reader.getHeight(0)));
		}
		catch (IOException | RuntimeException ex) {
			return Optional.empty();
		}
		finally {
			reader.dispose();
		}
	}

	private static Optional<ImageInfo> readWebp(byte[] d) {
		if (ascii(d, 12, "VP8X")) {
			return Optional.of(new ImageInfo(ImageType.WEBP, 1 + le24(d, 24), 1 + le24(d, 27)));
		}
		if (ascii(d, 12, "VP8L") && u(d, 20) == 0x2F) {
			int bits = u(d, 21) | (u(d, 22) << 8) | (u(d, 23) << 16) | (u(d, 24) << 24);
			return Optional.of(new ImageInfo(ImageType.WEBP, 1 + (bits & 0x3FFF), 1 + ((bits >> 14) & 0x3FFF)));
		}
		if (ascii(d, 12, "VP8 ") && u(d, 23) == 0x9D && u(d, 24) == 0x01 && u(d, 25) == 0x2A) {
			int width = (u(d, 26) | (u(d, 27) << 8)) & 0x3FFF;
			int height = (u(d, 28) | (u(d, 29) << 8)) & 0x3FFF;
			return Optional.of(new ImageInfo(ImageType.WEBP, width, height));
		}
		return Optional.empty();
	}

	private static boolean startsWith(byte[] data, int... signature) {
		if (data.length < signature.length) {
			return false;
		}
		for (int i = 0; i < signature.length; i++) {
			if (u(data, i) != signature[i]) {
				return false;
			}
		}
		return true;
	}

	private static boolean ascii(byte[] data, int offset, String text) {
		for (int i = 0; i < text.length(); i++) {
			if (offset + i >= data.length || data[offset + i] != (byte) text.charAt(i)) {
				return false;
			}
		}
		return true;
	}

	private static int le24(byte[] d, int offset) {
		return u(d, offset) | (u(d, offset + 1) << 8) | (u(d, offset + 2) << 16);
	}

	private static int u(byte[] d, int index) {
		return d[index] & 0xFF;
	}

}
