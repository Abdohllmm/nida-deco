package ma.nidaldeco.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class Slugs {

	public static final String PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

	private Slugs() {
	}

	public static String slugify(String input) {
		if (input == null) {
			return "";
		}
		String ascii = Normalizer.normalize(input, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		String slug = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
		return slug.length() > 180 ? slug.substring(0, 180).replaceAll("-+$", "") : slug;
	}

	/**
	 * Slug saisi par l'administrateur, ou dérivé du nom s'il est vide. Un slug dérivé
	 * déjà pris reçoit un suffixe numérique ; un slug saisi est renvoyé tel quel et
	 * son unicité est vérifiée par l'appelant.
	 */
	public static String resolve(String requested, String fallbackSource, Predicate<String> taken) {
		if (requested != null && !requested.isBlank()) {
			return requested.trim();
		}
		String base = slugify(fallbackSource);
		if (base.isEmpty()) {
			base = "element";
		}
		String candidate = base;
		for (int i = 2; taken.test(candidate); i++) {
			candidate = base + "-" + i;
		}
		return candidate;
	}

}
