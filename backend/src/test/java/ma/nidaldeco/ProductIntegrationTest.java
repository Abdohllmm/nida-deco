package ma.nidaldeco;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class ProductIntegrationTest extends IntegrationTest {

	private void setStatus(String id, String status) throws Exception {
		mvc.perform(patch("/api/admin/products/" + id + "/status").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"" + status + "\"}")).andExpect(status().isOk());
	}

	@Test
	void invalidProductIsRejectedWithFieldErrors() throws Exception {
		mvc.perform(post("/api/admin/products").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"name\":\"\",\"reference\":\"réf invalide\",\"price\":0,\"slug\":\"Pas Un Slug\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
			.andExpect(jsonPath("$.fieldErrors.name").exists())
			.andExpect(jsonPath("$.fieldErrors.reference").exists())
			.andExpect(jsonPath("$.fieldErrors.price").exists())
			.andExpect(jsonPath("$.fieldErrors.slug").exists())
			.andExpect(jsonPath("$.fieldErrors.categoryId").exists())
			.andExpect(jsonPath("$.fieldErrors.status").exists())
			.andExpect(jsonPath("$.fieldErrors.availability").exists());
	}

	@Test
	void fullCrudLifecycle() throws Exception {
		String category = createProductCategory("Bureaux");
		String image = uploadPng();

		MvcResult created = mvc
			.perform(post("/api/admin/products").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"Bureau Élégance","reference":"BUR-100","categoryId":"%s","status":"DRAFT",
						 "availability":"ON_ORDER","mainImageId":"%s","galleryIds":["%s"],
						 "colorOptions":["Noyer"," ","Noyer","Blanc"],"dimensions":"140 × 70 cm"}
						""".formatted(category, image, image)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.slug").value("bureau-elegance"))
			.andExpect(jsonPath("$.price").value(nullValue()))
			.andExpect(jsonPath("$.colorOptions", contains("Noyer", "Blanc")))
			.andExpect(jsonPath("$.gallery", hasSize(1)))
			.andExpect(jsonPath("$.mainImage.width").value(40))
			.andReturn();
		String id = id(created);

		mvc.perform(put("/api/admin/products/" + id).with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(productJson("Bureau Élégance XL", "BUR-100", category, "PUBLISHED", "4500.50")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Bureau Élégance XL"))
			.andExpect(jsonPath("$.price").value(4500.50))
			.andExpect(jsonPath("$.slug").value("bureau-elegance-xl"));

		mvc.perform(get("/api/admin/products/" + id).with(admin()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("PUBLISHED"));
		mvc.perform(get("/api/admin/products").with(admin())).andExpect(jsonPath("$.totalItems").value(1));

		mvc.perform(delete("/api/admin/products/" + id).with(admin()).with(csrf())).andExpect(status().isNoContent());
		mvc.perform(get("/api/admin/products/" + id).with(admin())).andExpect(status().isNotFound());
	}

	@Test
	void draftsAreNeverExposedPublicly() throws Exception {
		String category = createProductCategory("Bureaux");
		String id = createProduct("Bureau secret", "BUR-200", category, "DRAFT");

		mvc.perform(get("/api/public/products")).andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/public/products").param("q", "secret")).andExpect(jsonPath("$.items", hasSize(0)));
		mvc.perform(get("/api/public/products/bureau-secret")).andExpect(status().isNotFound());

		setStatus(id, "PUBLISHED");
		mvc.perform(get("/api/public/products")).andExpect(jsonPath("$.totalItems").value(1));
		mvc.perform(get("/api/public/products/bureau-secret"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.product.name").value("Bureau secret"))
			.andExpect(jsonPath("$.product.price").value(nullValue()));

		setStatus(id, "DRAFT");
		mvc.perform(get("/api/public/products/bureau-secret")).andExpect(status().isNotFound());
		mvc.perform(get("/api/public/products")).andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void draftServicesAndProjectsAreNotExposedEither() throws Exception {
		mvc.perform(post("/api/admin/services").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"title\":\"Cuisines modernes\",\"status\":\"DRAFT\"}")).andExpect(status().isCreated());
		mvc.perform(get("/api/public/services")).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(get("/api/public/services/cuisines-modernes")).andExpect(status().isNotFound());

		String type = id(mvc
			.perform(post("/api/admin/project-categories").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Cuisines\"}"))
			.andReturn());
		String project = id(mvc
			.perform(post("/api/admin/projects").with(admin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"Villa test\",\"categoryId\":\"%s\",\"status\":\"DRAFT\"}".formatted(type)))
			.andExpect(status().isCreated())
			.andReturn());
		mvc.perform(get("/api/public/projects")).andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/public/projects/villa-test")).andExpect(status().isNotFound());

		mvc.perform(patch("/api/admin/projects/" + project + "/status").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"status\":\"PUBLISHED\"}")).andExpect(status().isOk());
		mvc.perform(get("/api/public/projects").param("category", "cuisines"))
			.andExpect(jsonPath("$.totalItems").value(1));
		mvc.perform(get("/api/public/projects").param("category", "autre")).andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/public/projects/villa-test")).andExpect(status().isOk());
	}

	@Test
	void duplicateReferenceAndSlugAreRejected() throws Exception {
		String category = createProductCategory("Bureaux");
		createProduct("Bureau A", "BUR-300", category, "PUBLISHED");
		mvc.perform(post("/api/admin/products").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(productJson("Bureau B", "bur-300", category, "PUBLISHED", "null")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.fieldErrors.reference").exists());
		mvc.perform(post("/api/admin/products").with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"name":"Autre","slug":"bureau-a","reference":"BUR-301","categoryId":"%s","status":"DRAFT",
					 "availability":"IN_STOCK"}
					""".formatted(category)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.fieldErrors.slug").exists());
	}

	@Test
	void publicCatalogueSupportsSearchFiltersSortAndPagination() throws Exception {
		String desks = createProductCategory("Bureaux");
		String tables = createProductCategory("Tables");
		publish(desks, "Bureau Alpha", "A-1", "1000", "IN_STOCK");
		publish(desks, "Bureau Beta", "A-2", "null", "ON_ORDER");
		publish(desks, "Bureau Gamma", "A-3", "3000", "OUT_OF_STOCK");
		publish(tables, "Table Delta", "T-1", "2000", "IN_STOCK");

		mvc.perform(get("/api/public/products").param("q", "bureau")).andExpect(jsonPath("$.totalItems").value(3));
		mvc.perform(get("/api/public/products").param("q", "t-1"))
			.andExpect(jsonPath("$.items[0].name").value("Table Delta"));
		mvc.perform(get("/api/public/products").param("q", "%")).andExpect(jsonPath("$.totalItems").value(0));
		mvc.perform(get("/api/public/products").param("category", "tables"))
			.andExpect(jsonPath("$.totalItems").value(1));
		mvc.perform(get("/api/public/products").param("availability", "IN_STOCK"))
			.andExpect(jsonPath("$.totalItems").value(2));
		// Les produits sans prix arrivent en dernier, quel que soit le sens du tri.
		mvc.perform(get("/api/public/products").param("sort", "PRICE_ASC"))
			.andExpect(jsonPath("$.items[*].reference", contains("A-1", "T-1", "A-3", "A-2")));
		mvc.perform(get("/api/public/products").param("sort", "PRICE_DESC"))
			.andExpect(jsonPath("$.items[*].reference", contains("A-3", "T-1", "A-1", "A-2")));
		mvc.perform(get("/api/public/products").param("size", "3").param("page", "1"))
			.andExpect(jsonPath("$.items", hasSize(1)))
			.andExpect(jsonPath("$.totalPages").value(2))
			.andExpect(jsonPath("$.totalItems").value(4));
		mvc.perform(get("/api/public/products/bureau-alpha")).andExpect(jsonPath("$.similar", hasSize(2)));
	}

	private void publish(String category, String name, String reference, String price, String availability)
			throws Exception {
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/products")
			.with(admin())
			.with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(productJson(name, reference, category, "PUBLISHED", price).replace("IN_STOCK", availability)))
			.andExpect(status().isCreated());
	}

	@Test
	void categoryInUseCannotBeDeletedWithoutReassignment() throws Exception {
		String desks = createProductCategory("Bureaux");
		String tables = createProductCategory("Tables");
		String product = createProduct("Bureau A", "BUR-400", desks, "PUBLISHED");

		mvc.perform(delete("/api/admin/product-categories/" + desks).with(admin()).with(csrf()))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("CATEGORY_IN_USE"));
		mvc.perform(delete("/api/admin/product-categories/" + desks).param("reassignTo", desks)
			.with(admin())
			.with(csrf())).andExpect(status().isBadRequest());
		mvc.perform(delete("/api/admin/product-categories/" + desks).param("reassignTo", tables)
			.with(admin())
			.with(csrf())).andExpect(status().isNoContent());
		mvc.perform(get("/api/admin/products/" + product).with(admin()))
			.andExpect(jsonPath("$.category.slug").value("tables"));
		mvc.perform(get("/api/admin/product-categories").with(admin()))
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].itemCount").value(1));
	}

}
