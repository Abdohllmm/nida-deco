package ma.nidaldeco;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.jayway.jsonpath.JsonPath;

import ma.nidaldeco.auth.LoginRateLimiter;
import ma.nidaldeco.contact.ContactService;
import ma.nidaldeco.settings.SettingsService;

@SpringBootTest(properties = { "app.media.storage-dir=target/test-media", "app.media.max-file-size=1MB",
		"app.security.login-max-attempts=3", "app.security.contact-max-per-window=3", "app.frontend.dist-dir=",
		"app.public-base-url=https://exemple.test" })
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ExtendWith(DockerRequired.class)
abstract class IntegrationTest {

	@Autowired
	protected MockMvc mvc;

	@Autowired
	protected JdbcTemplate jdbc;

	@Autowired
	private LoginRateLimiter loginRateLimiter;

	@Autowired
	private ContactService contactService;

	@Autowired
	protected SettingsService settingsService;

	@BeforeEach
	void resetState() {
		jdbc.update("update company_settings set logo_id = null, hero_image_id = null");
		// Suppressions ordonnées : un TRUNCATE ... CASCADE viderait aussi company_settings.
		for (String table : new String[] { "product_images", "service_images", "project_images", "products",
				"services", "projects", "product_categories", "project_categories", "contact_requests",
				"media_assets", "admin_users" }) {
			jdbc.update("delete from " + table);
		}
		loginRateLimiter.clear();
		contactService.resetRateLimit();
		// Paramètres modifiés en SQL ci-dessus, hors de l'application : le cache doit être vidé.
		settingsService.evict();
	}

	/** Administrateur simulé, pour les tests qui ne portent pas sur la connexion elle-même. */
	protected static RequestPostProcessor admin() {
		return user("admin@exemple.test").roles("ADMIN");
	}

	protected static String id(MvcResult result) throws Exception {
		return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
	}

	protected String createProductCategory(String name) throws Exception {
		return id(mvc
			.perform(post("/api/admin/product-categories").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"" + name + "\"}"))
			.andReturn());
	}

	protected String productJson(String name, String reference, String categoryId, String status, String price) {
		return """
				{"name":"%s","reference":"%s","categoryId":"%s","status":"%s","price":%s,
				 "availability":"IN_STOCK","shortDescription":"Résumé","description":"Description",
				 "colorOptions":["Chêne","Blanc"],"galleryIds":[],"featured":false,"demo":false}
				""".formatted(name, reference, categoryId, status, price);
	}

	protected String createProduct(String name, String reference, String categoryId, String status) throws Exception {
		return id(mvc
			.perform(post("/api/admin/products").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(productJson(name, reference, categoryId, status, "null")))
			.andReturn());
	}

	protected static byte[] png(int width, int height) throws IOException {
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", out);
		return out.toByteArray();
	}

	protected String uploadPng() throws Exception {
		MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", png(40, 30));
		return id(mvc.perform(multipart("/api/admin/media").file(file).with(admin()).with(csrf())).andReturn());
	}

	protected static String unique() {
		return UUID.randomUUID().toString().substring(0, 8);
	}

}
