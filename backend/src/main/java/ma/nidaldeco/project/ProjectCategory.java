package ma.nidaldeco.project;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.nidaldeco.category.CategoryBase;

/** Type de réalisation (cuisine, dressing, bureau…). */
@Entity
@Table(name = "project_categories")
public class ProjectCategory extends CategoryBase {
}
