package ma.nidaldeco.settings;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import ma.nidaldeco.media.MediaService;
import ma.nidaldeco.settings.SettingsDtos.Update;
import ma.nidaldeco.settings.SettingsDtos.View;

@Service
public class SettingsService {

	/**
	 * Les paramètres sont lus par chaque page (en-tête HTML, API publique) mais ne changent que
	 * depuis l'administration : ils sont gardés en mémoire, ce qui évite plusieurs allers-retours
	 * vers une base distante à chaque affichage. Toute modification vide le cache ; la durée
	 * limite aussi le retard après un changement indirect (texte alternatif d'une image…).
	 */
	static final Duration CACHE_TTL = Duration.ofMinutes(5);

	private record Cached(View view, long loadedAt) {
	}

	private final CompanySettingsRepository repository;

	private final MediaService media;

	private final TransactionTemplate readOnly;

	private final AtomicReference<Cached> cache = new AtomicReference<>();

	/** Incrémenté à chaque modification : une lecture commencée avant n'est pas mise en cache. */
	private final AtomicLong version = new AtomicLong();

	public SettingsService(CompanySettingsRepository repository, MediaService media,
			PlatformTransactionManager transactionManager) {
		this.repository = repository;
		this.media = media;
		this.readOnly = new TransactionTemplate(transactionManager);
		this.readOnly.setReadOnly(true);
	}

	public View get() {
		Cached cached = cache.get();
		if (cached != null && System.nanoTime() - cached.loadedAt() < CACHE_TTL.toNanos()) {
			return cached.view();
		}
		long before = version.get();
		View view = readOnly.execute(status -> View.of(load()));
		if (version.get() == before) {
			cache.set(new Cached(view, System.nanoTime()));
		}
		return view;
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
		evictAfterCompletion();
		return View.of(s);
	}

	/** Vide le cache maintenant et une seconde fois à la fin de la transaction (validée ou non). */
	private void evictAfterCompletion() {
		evict();
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCompletion(int status) {
					evict();
				}
			});
		}
	}

	/** À appeler aussi après une modification faite hors de l'application (SQL direct, tests). */
	public void evict() {
		version.incrementAndGet();
		cache.set(null);
	}

	private CompanySettings load() {
		return repository.findById(CompanySettings.SINGLETON_ID)
			.orElseThrow(() -> new IllegalStateException("Paramètres de l'entreprise absents : migration non appliquée."));
	}

}
