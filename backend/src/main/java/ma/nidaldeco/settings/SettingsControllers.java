package ma.nidaldeco.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import ma.nidaldeco.settings.SettingsDtos.Update;
import ma.nidaldeco.settings.SettingsDtos.View;

@RestController
public class SettingsControllers {

	private final SettingsService service;

	public SettingsControllers(SettingsService service) {
		this.service = service;
	}

	@GetMapping({ "/api/public/settings", "/api/admin/settings" })
	View get() {
		return service.get();
	}

	@PutMapping("/api/admin/settings")
	View update(@Valid @RequestBody Update request) {
		return service.update(request);
	}

}
