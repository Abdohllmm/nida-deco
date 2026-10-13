package ma.nidaldeco.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.settings.SettingsDtos.Update;
import ma.nidaldeco.settings.SettingsDtos.View;

@Service
public class SettingsService {

	private final CompanySettingsRepository repository;

	private final MediaService media;

	public SettingsService(CompanySettingsRepository repository, MediaService media) {
		this.repository = repository;
		this.media = media;
	}

	@Transactional(readOnly = true)
	public View get() {
		return View.of(load());
	}

	@Transactional
	public View update(Update request) {
		CompanySettings s = load();
		s.displayName = request.displayName().trim();
		s.phone = request.phone().trim();
		s.whatsappNumber = request.whatsappNumber().trim();
		s.secondaryPhone = request.secondaryPhone() == null ? "" : request.secondaryPhone().trim();
		s.secondaryWhatsappNumber = request.secondaryWhatsappNumber() == null ? ""
				: request.secondaryWhatsappNumber().trim();
		s.instagramUrl = request.instagramUrl().trim();
		s.contactEmail = request.contactEmail().trim();
		s.city = request.city().trim();
		s.address = request.address().trim();
		s.openingHours = request.openingHours().trim();
		s.aboutText = request.aboutText().trim();
		s.logo = media.resolve(request.logoId(), "logoId");
		s.heroTitle = request.heroTitle().trim();
		s.heroSubtitle = request.heroSubtitle().trim();
		s.heroImage = media.resolve(request.heroImageId(), "heroImageId");
		s.introTitle = request.introTitle().trim();
		s.introText = request.introText().trim();
		return View.of(s);
	}

	private CompanySettings load() {
		return repository.findById(CompanySettings.SINGLETON_ID)
			.orElseThrow(() -> new IllegalStateException("Paramètres de l'entreprise absents : migration non appliquée."));
	}

}
