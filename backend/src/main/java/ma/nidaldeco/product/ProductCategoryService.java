package ma.nidaldeco.product;

import org.springframework.stereotype.Service;

import ma.nidaldeco.category.CategoryService;

@Service
public class ProductCategoryService extends CategoryService<ProductCategory> {

	private final ProductRepository products;

	public ProductCategoryService(ProductCategoryRepository categories, ProductRepository products) {
		super(categories, ProductCategory::new);
		this.products = products;
	}

	@Override
	protected long countItems(ProductCategory category) {
		return products.countByCategory(category);
	}

	@Override
	protected void reassignItems(ProductCategory from, ProductCategory to) {
		products.reassignCategory(from, to);
	}

}
