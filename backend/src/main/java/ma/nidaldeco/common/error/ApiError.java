package ma.nidaldeco.common.error;

import java.time.Instant;
import java.util.Map;

/** Format unique des réponses d'erreur de l'API. */
public record ApiError(int status, String code, String message, Map<String, String> fieldErrors, String path,
		Instant timestamp) {

	public static ApiError of(int status, String code, String message, Map<String, String> fieldErrors, String path) {
		return new ApiError(status, code, message, fieldErrors == null ? Map.of() : fieldErrors, path, Instant.now());
	}

}
