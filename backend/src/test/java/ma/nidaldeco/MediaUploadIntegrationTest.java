package ma.nidaldeco;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

class MediaUploadIntegrationTest extends IntegrationTest {

	private MockMultipartFile file(String name, String contentType, byte[] content) {
		return new MockMultipartFile("file", name, contentType, content);
	}

	@Test
	void uploadedImageGetsAGeneratedNameAndIsServedAsAnImage() throws Exception {
		MvcResult result = mvc
			.perform(multipart("/api/admin/media").file(file("../../etc/passwd.png", "image/png", png(64, 48)))
				.param("alt", "Bureau en chêne")
				.with(admin())
				.with(csrf()))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.width").value(64))
			.andExpect(jsonPath("$.height").value(48))
			.andExpect(jsonPath("$.alt").value("Bureau en chêne"))
			.andReturn();
		String url = JsonPath.read(result.getResponse().getContentAsString(), "$.url");
		assertThat(url).matches("^/media/[0-9a-f-]{36}\\.png$").doesNotContain("passwd");

		mvc.perform(get(url))
			.andExpect(status().isOk())
			.andExpect(content().contentType("image/png"))
			.andExpect(header().string("X-Content-Type-Options", "nosniff"));
	}

	@Test
	void uploadRequiresAnAdministrator() throws Exception {
		mvc.perform(multipart("/api/admin/media").file(file("a.png", "image/png", png(10, 10))).with(csrf()))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void contentThatIsNotAnImageIsRejectedEvenWithAnImageType() throws Exception {
		byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
		mvc.perform(multipart("/api/admin/media").file(file("photo.png", "image/png", html)).with(admin()).with(csrf()))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(jsonPath("$.code").value("FILE_CONTENT_INVALID"));
	}

	@Test
	void unsupportedAndMismatchedTypesAreRejected() throws Exception {
		byte[] gif = "GIF89a-not-really".getBytes(StandardCharsets.US_ASCII);
		mvc.perform(multipart("/api/admin/media").file(file("a.gif", "image/gif", gif)).with(admin()).with(csrf()))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));
		mvc.perform(multipart("/api/admin/media").file(file("a.svg", "image/svg+xml", "<svg/>".getBytes()))
			.with(admin())
			.with(csrf())).andExpect(status().isUnsupportedMediaType());
		// PNG valide annoncé comme JPEG.
		mvc.perform(multipart("/api/admin/media").file(file("a.jpg", "image/jpeg", png(10, 10)))
			.with(admin())
			.with(csrf()))
			.andExpect(status().isUnsupportedMediaType())
			.andExpect(jsonPath("$.code").value("FILE_CONTENT_INVALID"));
	}

	@Test
	void emptyAndOversizedFilesAreRejected() throws Exception {
		mvc.perform(multipart("/api/admin/media").file(file("a.png", "image/png", new byte[0]))
			.with(admin())
			.with(csrf())).andExpect(status().isBadRequest());
		// Limite fixée à 1 Mo pour les tests : en-tête PNG valide suivi de remplissage.
		byte[] big = Arrays.copyOf(png(10, 10), 1024 * 1024 + 1);
		mvc.perform(multipart("/api/admin/media").file(file("a.png", "image/png", big)).with(admin()).with(csrf()))
			.andExpect(status().is(413))
			.andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
	}

	@Test
	void pathTraversalOnMediaUrlsIsRefused() throws Exception {
		mvc.perform(get("/media/passwd")).andExpect(status().isNotFound());
		mvc.perform(get("/media/..%2F..%2Fpom.xml")).andExpect(status().is4xxClientError());
		mvc.perform(get("/media/00000000-0000-0000-0000-000000000000.png")).andExpect(status().isNotFound());
		mvc.perform(get("/media/00000000-0000-0000-0000-000000000000.html")).andExpect(status().isNotFound());
	}

	@Test
	void mediaInUseCannotBeDeleted() throws Exception {
		String image = uploadPng();
		String category = createProductCategory("Bureaux");
		String product = id(mvc
			.perform(post("/api/admin/products").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Bureau","reference":"BUR-500","categoryId":"%s","status":"DRAFT",
						 "availability":"IN_STOCK","mainImageId":"%s","galleryIds":["%s"]}
						""".formatted(category, image, image)))
			.andExpect(status().isCreated())
			.andReturn());

		mvc.perform(get("/api/admin/media").with(admin())).andExpect(jsonPath("$.items[0].usageCount").value(2));
		mvc.perform(delete("/api/admin/media/" + image).with(admin()).with(csrf()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("MEDIA_IN_USE"));

		mvc.perform(delete("/api/admin/products/" + product).with(admin()).with(csrf()))
			.andExpect(status().isNoContent());
		mvc.perform(patch("/api/admin/media/" + image).with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"alt\":\"Nouveau texte\"}")).andExpect(jsonPath("$.alt").value("Nouveau texte"));
		mvc.perform(delete("/api/admin/media/" + image).with(admin()).with(csrf())).andExpect(status().isNoContent());
		mvc.perform(get("/api/admin/media").with(admin())).andExpect(jsonPath("$.totalItems").value(0));
	}

}
