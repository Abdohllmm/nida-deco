package ma.nidaldeco.project;

import org.springframework.stereotype.Service;

import ma.nidaldeco.category.CategoryService;

@Service
public class ProjectCategoryService extends CategoryService<ProjectCategory> {

	private final ProjectRepository projects;

	public ProjectCategoryService(ProjectCategoryRepository categories, ProjectRepository projects) {
		super(categories, ProjectCategory::new);
		this.projects = projects;
	}

	@Override
	protected long countItems(ProjectCategory category) {
		return projects.countByCategory(category);
	}

	@Override
	protected void reassignItems(ProjectCategory from, ProjectCategory to) {
		projects.reassignCategory(from, to);
	}

}
