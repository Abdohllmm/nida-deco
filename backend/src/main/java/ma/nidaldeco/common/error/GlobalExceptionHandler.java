package ma.nidaldeco.common.error;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
		return respond(ex.getStatus(), ex.getCode(), ex.getMessage(), ex.getFieldErrors(), request);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
		Map<String, String> fields = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors().forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));
		ex.getBindingResult()
			.getGlobalErrors()
			.forEach(e -> fields.putIfAbsent(e.getObjectName(), e.getDefaultMessage()));
		return respond(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Certains champs sont invalides.", fields, request);
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
			MissingServletRequestParameterException.class, MissingServletRequestPartException.class })
	ResponseEntity<ApiError> handleBadRequest(Exception ex, HttpServletRequest request) {
		return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "La requête est invalide.", null, request);
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<ApiError> handleTooLarge(MaxUploadSizeExceededException ex, HttpServletRequest request) {
		return respond(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE", "Le fichier dépasse la taille maximale autorisée.",
				null, request);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ApiError> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
		log.warn("Violation d'intégrité sur {} : {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
		return respond(HttpStatus.CONFLICT, "CONFLICT",
				"L'opération est impossible : la donnée est en conflit avec un élément existant.", null, request);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
		return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", "Ressource introuvable.", null, request);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<ApiError> handleMethod(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
		return respond(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Méthode non autorisée.", null, request);
	}

	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	ResponseEntity<ApiError> handleMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
		return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", "Format de requête non pris en charge.",
				null, request);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) throws Exception {
		if (ex instanceof AccessDeniedException) {
			throw ex;
		}
		log.error("Erreur inattendue sur {} {}", request.getMethod(), request.getRequestURI(), ex);
		return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
				"Une erreur inattendue est survenue. Veuillez réessayer.", null, request);
	}

	private ResponseEntity<ApiError> respond(HttpStatus status, String code, String message,
			Map<String, String> fieldErrors, HttpServletRequest request) {
		return ResponseEntity.status(status)
			.body(ApiError.of(status.value(), code, message, fieldErrors, request.getRequestURI()));
	}

}
