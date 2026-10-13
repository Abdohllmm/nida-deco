package ma.nidaldeco.seo;

/**
 * Métadonnées d'une page publique. found = false signale un contenu inexistant ou
 * non publié : la page est servie avec un statut 404 et n'est pas indexable.
 */
public record PageMeta(String title, String description, String imagePath, String type, boolean indexable,
		boolean found) {

	public static PageMeta page(String title, String description) {
		return new PageMeta(title, description, null, "website", true, true);
	}

	public static PageMeta content(String title, String description, String imagePath, String type) {
		return new PageMeta(title, description, imagePath, type, true, true);
	}

	/** Page existante mais à ne pas indexer (textes légaux encore à compléter). */
	public static PageMeta hidden(String title) {
		return new PageMeta(title, "", null, "website", false, true);
	}

	public static PageMeta notFound() {
		return new PageMeta("Page introuvable", "", null, "website", false, false);
	}

	public static PageMeta admin() {
		return hidden("Administration");
	}

}
