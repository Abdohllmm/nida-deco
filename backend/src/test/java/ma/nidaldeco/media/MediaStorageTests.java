package ma.nidaldeco.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.util.unit.DataSize;

import ma.nidaldeco.config.AppProperties;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** Tests sans contexte Spring, sans base de données et sans aucun appel réseau : le client S3 est simulé. */
class MediaStorageTests {

	private static final String NAME = "3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.jpg";

	private static final String SECRET = "valeur-secrete-de-test";

	private static final List<String> DANGEROUS = List.of("../secret.jpg", "..\\secret.jpg", "/etc/passwd",
			"media/" + NAME, NAME + "/../x.jpg", "photo.jpg", "3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.html",
			"3f2b8c1e-9a4d-4c7e-8f1a-2b3c4d5e6f70.jpg%00.png", "");

	private static AppProperties properties(String storage, String dir, AppProperties.S3 s3) {
		return new AppProperties(null, null, new AppProperties.Media(storage, dir, DataSize.ofMegabytes(8), s3), null,
				null, null);
	}

	private static AppProperties.S3 s3(String endpoint, String bucket, String accessKey, String secret,
			String publicBaseUrl) {
		return new AppProperties.S3(endpoint, "auto", bucket, accessKey, secret, publicBaseUrl);
	}

	private static AppProperties.S3 validS3() {
		return s3("https://compte.r2.exemple.test", "nidal-deco", "cle-de-test", SECRET, "https://medias.exemple.test/");
	}

	@SuppressWarnings("unchecked")
	private static ObjectProvider<S3Client> provider(S3Client client) {
		ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
		when(provider.getObject()).thenReturn(client);
		return provider;
	}

	// --- Stockage sur disque ---

	@Test
	void filesystemStoresLoadsAndDeletes(@TempDir Path dir) throws Exception {
		FilesystemMediaStorage storage = new FilesystemMediaStorage(dir.resolve("medias").toString());
		byte[] content = { 1, 2, 3 };

		storage.store(NAME, content);
		assertThat(dir.resolve("medias").resolve(NAME)).hasBinaryContent(content);
		assertThat(storage.load(NAME)).isPresent();
		assertThat(storage.load(NAME).orElseThrow().getContentAsByteArray()).isEqualTo(content);
		// En local, l'application sert elle-même le fichier : pas d'adresse publique externe.
		assertThat(storage.publicUrl(NAME)).isEmpty();

		storage.delete(NAME);
		assertThat(storage.load(NAME)).isEmpty();
		assertThat(Files.list(dir.resolve("medias"))).isEmpty();
	}

	@Test
	void filesystemRefusesNamesNotGeneratedByTheServer(@TempDir Path dir) throws Exception {
		Path root = dir.resolve("medias");
		FilesystemMediaStorage storage = new FilesystemMediaStorage(root.toString());
		Files.writeString(dir.resolve("secret.jpg"), "confidentiel");
		for (String name : DANGEROUS) {
			assertThatThrownBy(() -> storage.store(name, new byte[] { 1 })).as(name)
				.isInstanceOf(IllegalArgumentException.class);
			assertThat(storage.load(name)).as(name).isEmpty();
			storage.delete(name);
		}
		// Rien n'a été écrit dans le dossier, rien n'a été touché en dehors.
		assertThat(Files.list(root)).isEmpty();
		assertThat(dir.resolve("secret.jpg")).hasContent("confidentiel");
	}

	// --- Stockage objet S3 ---

	@Test
	void s3UploadsUnderASafeKeyWithImageContentType() {
		S3Client client = mock(S3Client.class);
		S3MediaStorage storage = new S3MediaStorage(client, "nidal-deco", "https://medias.exemple.test/");

		storage.store(NAME, new byte[] { 1, 2, 3 });

		ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
		verify(client).putObject(request.capture(), any(RequestBody.class));
		assertThat(request.getValue().bucket()).isEqualTo("nidal-deco");
		assertThat(request.getValue().key()).isEqualTo("media/" + NAME);
		assertThat(request.getValue().contentType()).isEqualTo("image/jpeg");
		assertThat(request.getValue().cacheControl()).contains("immutable");
	}

	@Test
	void s3NeverBuildsAKeyFromADangerousName() {
		S3Client client = mock(S3Client.class);
		S3MediaStorage storage = new S3MediaStorage(client, "nidal-deco", "https://medias.exemple.test");
		for (String name : DANGEROUS) {
			assertThatThrownBy(() -> storage.store(name, new byte[] { 1 })).as(name)
				.isInstanceOf(IllegalArgumentException.class);
			storage.delete(name);
			assertThat(storage.publicUrl(name)).as(name).isEmpty();
		}
		assertThatThrownBy(() -> storage.store(null, new byte[] { 1 })).isInstanceOf(IllegalArgumentException.class);
		verifyNoInteractions(client);
	}

	@Test
	void s3DeletesTheMatchingObject() {
		S3Client client = mock(S3Client.class);
		new S3MediaStorage(client, "nidal-deco", "https://medias.exemple.test").delete(NAME);

		ArgumentCaptor<DeleteObjectRequest> request = ArgumentCaptor.forClass(DeleteObjectRequest.class);
		verify(client).deleteObject(request.capture());
		assertThat(request.getValue().bucket()).isEqualTo("nidal-deco");
		assertThat(request.getValue().key()).isEqualTo("media/" + NAME);
	}

	@Test
	void s3BuildsThePublicUrlAndDoesNotReadLocally() {
		S3MediaStorage storage = new S3MediaStorage(mock(S3Client.class), "nidal-deco", "https://medias.exemple.test//");
		assertThat(storage.publicUrl(NAME)).contains(URI.create("https://medias.exemple.test/media/" + NAME));
		assertThat(storage.load(NAME)).isEmpty();
	}

	@Test
	void s3UploadFailureIsReportedWithoutLeakingDetails() {
		S3Client client = mock(S3Client.class);
		when(client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
			.thenThrow(SdkClientException.create("connexion refusée"));
		S3MediaStorage storage = new S3MediaStorage(client, "nidal-deco", "https://medias.exemple.test");
		assertThatThrownBy(() -> storage.store(NAME, new byte[] { 1 })).isInstanceOf(IllegalStateException.class)
			.hasMessage("Échec de l'envoi du média vers le stockage objet.");
	}

	// --- Sélection et validation de la configuration ---

	@Test
	void filesystemIsSelectedByDefaultAndOnRequest(@TempDir Path dir) {
		MediaStorageConfig config = new MediaStorageConfig();
		for (String value : new String[] { null, "", "filesystem", " FileSystem " }) {
			AppProperties properties = properties(value, dir.toString(), null);
			assertThat(config.mediaStorage(properties, provider(null))).as("storage=" + value)
				.isInstanceOf(FilesystemMediaStorage.class);
			assertThat(MediaStorageConfig.publicOrigin(properties)).isEmpty();
		}
	}

	@Test
	void s3IsSelectedWhenConfigured(@TempDir Path dir) {
		AppProperties properties = properties("s3", dir.toString(), validS3());
		MediaStorage storage = new MediaStorageConfig().mediaStorage(properties, provider(mock(S3Client.class)));
		assertThat(storage).isInstanceOf(S3MediaStorage.class);
		assertThat(storage.publicUrl(NAME)).contains(URI.create("https://medias.exemple.test/media/" + NAME));
		// Origine autorisée comme source d'images dans la politique de sécurité du site.
		assertThat(MediaStorageConfig.publicOrigin(properties)).contains("https://medias.exemple.test");
		// Le client réel se construit sans appel réseau.
		try (S3Client client = new MediaStorageConfig().s3Client(properties)) {
			assertThat(client.serviceName()).isEqualTo("s3");
		}
	}

	@Test
	void unknownStorageTypeStopsStartup(@TempDir Path dir) {
		assertThatThrownBy(() -> new MediaStorageConfig().mediaStorage(properties("ftp", dir.toString(), null),
				provider(null)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("APP_MEDIA_STORAGE invalide")
			.hasMessageContaining("filesystem, s3");
	}

	@Test
	void missingS3SettingsStopStartupNamingOnlyTheVariables() {
		AppProperties incomplete = properties("s3", "x", s3("", "nidal-deco", "cle-de-test", SECRET, " "));
		assertThatThrownBy(() -> MediaStorageConfig.validated(incomplete)).isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("S3_ENDPOINT")
			.hasMessageContaining("S3_PUBLIC_BASE_URL")
			.hasMessageNotContaining("S3_BUCKET")
			.hasMessageNotContaining(SECRET)
			.hasMessageNotContaining("cle-de-test");

		AppProperties noSecret = properties("s3", "x",
				s3("https://compte.r2.exemple.test", "", "cle-de-test", null, "https://medias.exemple.test"));
		assertThatThrownBy(() -> MediaStorageConfig.validated(noSecret))
			.hasMessageContaining("S3_BUCKET")
			.hasMessageContaining("S3_SECRET_ACCESS_KEY")
			.hasMessageNotContaining("cle-de-test");

		assertThatThrownBy(() -> MediaStorageConfig.validated(properties("s3", "x", null)))
			.isInstanceOf(IllegalStateException.class);
		// La même vérification protège la création du client et celle du stockage.
		assertThatThrownBy(() -> new MediaStorageConfig().s3Client(incomplete)).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new MediaStorageConfig().mediaStorage(incomplete, provider(mock(S3Client.class))))
			.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void invalidS3UrlsAreRejected() {
		for (String url : new String[] { "compte.r2.exemple.test", "ftp://compte.exemple.test", "https://",
				"https://medias.exemple.test/?a=b", "pas une url" }) {
			AppProperties bad = properties("s3", "x", s3("https://compte.r2.exemple.test", "b", "k", SECRET, url));
			assertThatThrownBy(() -> MediaStorageConfig.validated(bad)).as(url)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("S3_PUBLIC_BASE_URL")
				.hasMessageNotContaining(SECRET);
		}
	}

	// --- Supabase Storage : formes d'adresses et confusions endpoint / adresse publique ---

	private static final String SB_ENDPOINT = "https://abcdefghijklmnop.storage.supabase.co/storage/v1/s3";

	private static final String SB_PUBLIC = "https://abcdefghijklmnop.supabase.co/storage/v1/object/public/nidal-deco-media";

	private static AppProperties supabase(String endpoint, String region, String bucket, String publicBaseUrl) {
		return properties("s3", "x", new AppProperties.S3(endpoint, region, bucket, "cle-de-test", SECRET, publicBaseUrl));
	}

	@Test
	void supabaseConfigurationIsAcceptedAndServesObjectsUnderMediaPrefix(@TempDir Path dir) {
		AppProperties properties = supabase(SB_ENDPOINT, "eu-central-1", "nidal-deco-media", SB_PUBLIC + "/");
		assertThat(MediaStorageConfig.validated(properties)).isNotNull();
		MediaStorage storage = new MediaStorageConfig().mediaStorage(properties, provider(mock(S3Client.class)));
		// Objet enregistré sous media/{uuid} → lisible à l'adresse publique du bucket + /media/{uuid}.
		assertThat(storage.publicUrl(NAME)).contains(URI.create(SB_PUBLIC + "/media/" + NAME));
		assertThat(MediaStorageConfig.publicOrigin(properties)).contains("https://abcdefghijklmnop.supabase.co");
		// L'ancien nom d'hôte du projet est aussi accepté pour l'endpoint.
		assertThat(MediaStorageConfig.validated(supabase("https://abcdefghijklmnop.supabase.co/storage/v1/s3",
				"eu-central-1", "nidal-deco-media", SB_PUBLIC)))
			.isNotNull();
		// Le client réel accepte un endpoint comportant un chemin, sans appel réseau.
		try (S3Client client = new MediaStorageConfig().s3Client(properties)) {
			assertThat(client.serviceName()).isEqualTo("s3");
		}
	}

	@Test
	void endpointAndPublicUrlCannotBeConfused() {
		// Les deux adresses inversées.
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_PUBLIC, "eu-central-1", "nidal-deco-media", SB_ENDPOINT)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("S3_ENDPOINT")
			.hasMessageNotContaining(SECRET);
		// La même adresse dans les deux variables.
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, "eu-central-1", "nidal-deco-media", SB_ENDPOINT)))
			.hasMessageContaining("identiques");
		// L'endpoint S3 recopié comme adresse publique, hors Supabase.
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase("https://api.exemple.test", "eu-west-1", "b",
				"https://stockage.exemple.test/v1/s3")))
			.hasMessageContaining("S3_PUBLIC_BASE_URL");
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase("https://cdn.exemple.test/object/public/b",
				"eu-west-1", "b", "https://medias.exemple.test")))
			.hasMessageContaining("S3_ENDPOINT");
	}

	@Test
	void supabasePublicUrlMustPointToTheConfiguredBucket() {
		for (String publicUrl : new String[] { "https://abcdefghijklmnop.supabase.co",
				"https://abcdefghijklmnop.supabase.co/storage/v1/object/public",
				"https://abcdefghijklmnop.supabase.co/storage/v1/object/public/autre-bucket",
				"https://abcdefghijklmnop.supabase.co/storage/v1/object/public/nidal-deco-media/media",
				"https://abcdefghijklmnop.supabase.co/storage/v1/object/nidal-deco-media" }) {
			assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, "eu-central-1", "nidal-deco-media", publicUrl)))
				.as(publicUrl)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("S3_PUBLIC_BASE_URL")
				.hasMessageContaining("NOM_DU_BUCKET");
		}
		// Endpoint sans le chemin de l'API S3.
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase("https://abcdefghijklmnop.storage.supabase.co",
				"eu-central-1", "nidal-deco-media", SB_PUBLIC)))
			.hasMessageContaining("/storage/v1/s3");
		// Deux projets différents.
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, "eu-central-1", "nidal-deco-media",
				"https://zyxwvutsrqponmlk.supabase.co/storage/v1/object/public/nidal-deco-media")))
			.hasMessageContaining("même projet");
	}

	@Test
	void regionIsRequiredAndNeverAutoForSupabase() {
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, "auto", "nidal-deco-media", SB_PUBLIC)))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("S3_REGION")
			.hasMessageContaining("auto");
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, " ", "nidal-deco-media", SB_PUBLIC)))
			.hasMessageContaining("manquante")
			.hasMessageContaining("S3_REGION");
		assertThatThrownBy(() -> MediaStorageConfig.validated(supabase(SB_ENDPOINT, "EU Central", "nidal-deco-media", SB_PUBLIC)))
			.hasMessageContaining("S3_REGION invalide");
	}

	@Test
	void s3SettingsNeverPrintTheirCredentials() {
		assertThat(validS3().toString()).contains("nidal-deco").doesNotContain(SECRET).doesNotContain("cle-de-test");
		assertThat(properties("s3", "x", validS3()).toString()).doesNotContain(SECRET).doesNotContain("cle-de-test");
	}

}
