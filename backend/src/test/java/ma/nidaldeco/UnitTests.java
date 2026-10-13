package ma.nidaldeco;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import ma.nidaldeco.common.AttemptLimiter;
import ma.nidaldeco.common.Slugs;
import ma.nidaldeco.common.StringListConverter;
import ma.nidaldeco.contact.ContactDtos;
import ma.nidaldeco.contact.ContactRequest.NeedType;
import ma.nidaldeco.media.ImageInspector;
import ma.nidaldeco.media.ImageInspector.ImageType;
import ma.nidaldeco.media.MediaStorage;

/** Tests sans contexte Spring ni base de données. */
class UnitTests {

	@Test
	void slugifyRemovesAccentsAndPunctuation() {
		assertThat(Slugs.slugify("  Bureau Élégance — 140 cm ! ")).isEqualTo("bureau-elegance-140-cm");
		assertThat(Slugs.slugify("Dressings & Placards")).isEqualTo("dressings-placards");
		assertThat(Slugs.slugify("???")).isEmpty();
	}

	@Test
	void derivedSlugGetsASuffixWhenTaken() {
		Set<String> taken = Set.of("bureau", "bureau-2");
		assertThat(Slugs.resolve("", "Bureau", taken::contains)).isEqualTo("bureau-3");
		assertThat(Slugs.resolve("mon-slug", "Bureau", taken::contains)).isEqualTo("mon-slug");
		assertThat(Slugs.resolve(null, "???", taken::contains)).isEqualTo("element");
	}

	@Test
	void stringListConverterRoundTripsAndCleans() {
		StringListConverter converter = new StringListConverter();
		String column = converter.convertToDatabaseColumn(List.of(" Chêne ", "", "Blanc", "Chêne"));
		assertThat(column).isEqualTo("Chêne\nBlanc");
		assertThat(converter.convertToEntityAttribute(column)).containsExactly("Chêne", "Blanc");
		assertThat(converter.convertToDatabaseColumn(List.of())).isNull();
		assertThat(converter.convertToEntityAttribute(null)).isEmpty();
	}

	@Test
	void attemptLimiterBlocksThenReleasesAfterTheWindow() {
		Instant[] now = { Instant.parse("2026-01-01T10:00:00Z") };
		Clock clock = new Clock() {
			@Override
			public java.time.ZoneId getZone() {
				return ZoneOffset.UTC;
			}

			@Override
			public Clock withZone(java.time.ZoneId zone) {
				return this;
			}

			@Override
			public Instant instant() {
				return now[0];
			}
		};
		AttemptLimiter limiter = new AttemptLimiter(2, Duration.ofMinutes(15), clock);
		assertThat(limiter.tryAcquire("ip")).isTrue();
		assertThat(limiter.tryAcquire("ip")).isTrue();
		assertThat(limiter.tryAcquire("ip")).isFalse();
		assertThat(limiter.isBlocked("autre")).isFalse();
		assertThat(limiter.retryAfter("ip")).isEqualTo(Duration.ofMinutes(15));
		now[0] = now[0].plus(Duration.ofMinutes(15));
		assertThat(limiter.isBlocked("ip")).isFalse();
		assertThat(limiter.tryAcquire("ip")).isTrue();
	}

	@Test
	void imageInspectorRecognisesRealImagesOnly() throws Exception {
		assertThat(ImageInspector.inspect(encode("png"))).hasValueSatisfying(info -> {
			assertThat(info.type()).isEqualTo(ImageType.PNG);
			assertThat(info.width()).isEqualTo(20);
			assertThat(info.height()).isEqualTo(10);
		});
		assertThat(ImageInspector.inspect(encode("jpg"))).map(ImageInspector.ImageInfo::type).contains(ImageType.JPEG);
		assertThat(ImageInspector.inspect("<svg onload=alert(1)/>".getBytes(StandardCharsets.UTF_8))).isEmpty();
		assertThat(ImageInspector.inspect(new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0 })).isEmpty();
		assertThat(ImageInspector.inspect(new byte[0])).isEmpty();
	}

	@Test
	void imageInspectorReadsWebpDimensions() {
		// En-tête WebP étendu (VP8X) : largeur 300, hauteur 200.
		byte[] webp = new byte[30];
		System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, webp, 0, 4);
		System.arraycopy("WEBP".getBytes(StandardCharsets.US_ASCII), 0, webp, 8, 4);
		System.arraycopy("VP8X".getBytes(StandardCharsets.US_ASCII), 0, webp, 12, 4);
		webp[24] = (byte) 299;
		webp[25] = (byte) (299 >> 8);
		webp[27] = (byte) 199;
		assertThat(ImageInspector.inspect(webp)).hasValueSatisfying(info -> {
			assertThat(info.type()).isEqualTo(ImageType.WEBP);
			assertThat(info.width()).isEqualTo(300);
			assertThat(info.height()).isEqualTo(200);
		});
	}

	@Test
	void onlyServerGeneratedFilenamesAreAccepted() {
		assertThat(MediaStorage.FILENAME.matcher("3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.jpg").matches()).isTrue();
		for (String name : List.of("../secret.png", "a.png", "3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.html",
				"3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.jpg/..", "3F2B8C1E-9A4D-4C7E-8F1A-2B3C4D5E6F70.jpg")) {
			assertThat(MediaStorage.FILENAME.matcher(name).matches()).as(name).isFalse();
		}
	}

	@Test
	void contactRequestValidation() {
		Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
		ContactDtos.Create valid = new ContactDtos.Create("Client", "+212 6 61 56 87 71", null, NeedType.PRODUIT,
				"Je souhaite des informations.", null, null, true);
		assertThat(validator.validate(valid)).isEmpty();
		ContactDtos.Create invalid = new ContactDtos.Create(" ", "12", "x@", null, "court", null, null, false);
		assertThat(validator.validate(invalid)).extracting(v -> v.getPropertyPath().toString())
			.containsExactlyInAnyOrder("name", "phone", "email", "needType", "message", "consent");
		for (ConstraintViolation<ContactDtos.Create> violation : validator.validate(invalid)) {
			assertThat(violation.getMessage()).isNotBlank();
		}
	}

	private static byte[] encode(String format) throws Exception {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB), format, out);
		return out.toByteArray();
	}

}
