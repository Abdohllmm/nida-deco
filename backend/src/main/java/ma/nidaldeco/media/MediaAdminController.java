package ma.nidaldeco.media;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import ma.nidaldeco.common.PageResponse;

@RestController
@RequestMapping("/api/admin/media")
public class MediaAdminController {

	private final MediaService service;

	public MediaAdminController(MediaService service) {
		this.service = service;
	}

	@GetMapping
	PageResponse<MediaDto.Admin> list(@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "24") int size) {
		return service.list(page, size);
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	MediaDto upload(@RequestPart("file") MultipartFile file, @RequestParam(required = false) String alt)
			throws IOException {
		return MediaDto.of(service.store(file.getBytes(), file.getOriginalFilename(), file.getContentType(), alt));
	}

	@PatchMapping("/{id}")
	MediaDto.Admin updateAlt(@PathVariable UUID id, @Valid @RequestBody MediaDto.AltUpdate request) {
		return service.updateAlt(id, request.alt());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id) {
		service.delete(id);
	}

}
