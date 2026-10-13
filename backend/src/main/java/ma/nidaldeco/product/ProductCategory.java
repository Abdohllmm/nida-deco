package ma.nidaldeco.product;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.nidaldeco.category.CategoryBase;

@Entity
@Table(name = "product_categories")
public class ProductCategory extends CategoryBase {
}
