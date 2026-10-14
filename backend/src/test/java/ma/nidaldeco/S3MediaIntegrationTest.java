package ma.nidaldeco;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import ma.nidaldeco.media.MediaStorage;
import ma.nidaldeco.media.S3MediaStorage;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Application complète en mode stockage objet. Le client S3 est remplacé par un
 * simulacre : aucun appel réseau n'est émis.
 */
@TestPropertySource(properties = { "app.media.storage=s3", "app.media.s3.endpoint=https://compte.r2.exemple.test",
		"app.media.s3.region=auto", "app.media.s3.bucket=bucket-de-test", "app.media.s3.access-key-id=cle-de-test",
		"app.media.s3.secret-access-key=secret-de-test",
		"app.media.s3.public-base-url=https://medias.exemple.test" })
class S3MediaIntegrationTest extends IntegrationTest {

	@MockitoBean
	private S3Client s3Client;

	@Autowired
	private MediaStorage storage;

	@Test
	void s3StorageIsActive() {
		assertThat(storage).isInstanceOf(S3MediaStorage.class);
	}

	@Test
	void uploadGoesToTheBucketAndMediaUrlRedirectsToThePublicAddress() throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", "../../etc/passwd.png", "image/png", png(40, 30));
		MvcResult result = mvc.perform(multipart("/api/admin/media").file(file).with(admin()).with(csrf()))
			.andExpect(status().isCreated())
			.andReturn();
		String url = JsonPath.read(result.getResponse().getContentAsString(), "$.url");
		// Le frontend reçoit toujours la même forme d'adresse, quel que soit le stockage.
		assertThat(url).matches("^/media/[0-9a-f-]{36}\\.png$");
		String filename = url.substring("/media/".length());

		ArgumentCaptor<PutObjectRequest> put = ArgumentCaptor.forClass(PutObjectRequest.class);
		verify(s3Client).putObject(put.capture(), any(RequestBody.class));
		assertThat(put.getValue().bucket()).isEqualTo("bucket-de-test");
		assertThat(put.getValue().key()).isEqualTo("media/" + filename).doesNotContain("passwd").doesNotContain("..");
		assertThat(put.getValue().contentType()).isEqualTo("image/png");

		mvc.perform(get(url))
			.andExpect(status().isFound())
			.andExpect(header().string("Location", "https://medias.exemple.test/media/" + filename));
	}

	@Test
	void unknownOrMalformedMediaNeverRedirects() throws Exception {
		mvc.perform(get("/media/00000000-0000-0000-0000-000000000000.png"))
			.andExpect(status().isNotFound())
			.andExpect(header().doesNotExist("Location"));
		mvc.perform(get("/media/passwd")).andExpect(status().isNotFound());
		mvc.perform(get("/media/00000000-0000-0000-0000-000000000000.html")).andExpect(status().isNotFound());
	}

	@Test
	void invalidUploadNeverReachesTheBucket() throws Exception {
		MockMultipartFile html = new MockMultipartFile("file", "a.png", "image/png", "<html></html>".getBytes());
		mvc.perform(multipart("/api/admin/media").file(html).with(admin()).with(csrf()))
			.andExpect(status().isUnsupportedMediaType());
		verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
	}

	@Test
	void deletingAnUnusedMediaDeletesTheObjectButAUsedOneIsKept() throws Exception {
		String image = uploadPng();
		String category = createProductCategory("Bureaux");
		String product = id(mvc
			.perform(post("/api/admin/products").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Bureau","reference":"BUR-S3","categoryId":"%s","status":"DRAFT",
						 "availability":"IN_STOCK","mainImageId":"%s","galleryIds":[]}
						""".formatted(category, image)))
			.andExpect(status().isCreated())
			.andReturn());

		// Encore utilisée : refus, et l'objet reste dans le bucket.
		mvc.perform(delete("/api/admin/media/" + image).with(admin()).with(csrf()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("MEDIA_IN_USE"));
		verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));

		mvc.perform(delete("/api/admin/products/" + product).with(admin()).with(csrf()))
			.andExpect(status().isNoContent());
		mvc.perform(delete("/api/admin/media/" + image).with(admin()).with(csrf())).andExpect(status().isNoContent());

		ArgumentCaptor<DeleteObjectRequest> deleted = ArgumentCaptor.forClass(DeleteObjectRequest.class);
		verify(s3Client).deleteObject(deleted.capture());
		assertThat(deleted.getValue().bucket()).isEqualTo("bucket-de-test");
		assertThat(deleted.getValue().key()).matches("^media/[0-9a-f-]{36}\\.png$");
	}

	@Test
	void contentSecurityPolicyAllowsOnlyThePublicMediaOrigin() throws Exception {
		mvc.perform(get("/api/public/settings"))
			.andExpect(header().string("Content-Security-Policy",
					containsString("img-src 'self' data: blob: https://medias.exemple.test;")));
	}

}
