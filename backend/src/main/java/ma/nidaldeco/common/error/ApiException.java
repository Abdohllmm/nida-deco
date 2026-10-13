package ma.nidaldeco.common.error;

import java.util.Map;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

	private final HttpStatus status;

	private final String code;

	private final Map<String, String> fieldErrors;

	public ApiException(HttpStatus status, String code, String message, Map<String, String> fieldErrors) {
		super(message);
		this.status = status;
		this.code = code;
		this.fieldErrors = fieldErrors == null ? Map.of() : fieldErrors;
	}

	public ApiException(HttpStatus status, String code, String message) {
		this(status, code, message, null);
	}

	public static ApiException notFound(String message) {
		return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
	}

	public static ApiException badRequest(String code, String message) {
		return new ApiException(HttpStatus.BAD_REQUEST, code, message);
	}

	public static ApiException conflict(String code, String message) {
		return new ApiException(HttpStatus.CONFLICT, code, message);
	}

	/** Erreur rattachée à un champ de formulaire (valeur déjà utilisée, référence inconnue…). */
	public static ApiException field(HttpStatus status, String field, String message) {
		return new ApiException(status, status == HttpStatus.CONFLICT ? "CONFLICT" : "VALIDATION_ERROR", message,
				Map.of(field, message));
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCode() {
		return code;
	}

	public Map<String, String> getFieldErrors() {
		return fieldErrors;
	}

}
