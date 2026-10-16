package ma.nidaldeco.media;

import java.net.URI;

import org.springframework.boot.jackson.JacksonComponent;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ser.std.StdSerializer;

/**
 * Écrit l'adresse d'une image telle que le navigateur doit la charger. Avec un stockage objet
 * (Supabase…), c'est directement l'adresse publique du fichier : le navigateur ne passe plus par
 * « /media/… », qui coûtait une requête au serveur et une lecture en base par image avant la
 * redirection. Sur disque, l'adresse reste « /media/… », servie par l'application.
 */
@JacksonComponent
class MediaDtoSerializer extends StdSerializer<MediaDto> {

	private static final String MEDIA_PATH = "/media/";

	private final MediaStorage storage;

	MediaDtoSerializer(MediaStorage storage) {
		super(MediaDto.class);
		this.storage = storage;
	}

	@Override
	public void serialize(MediaDto value, JsonGenerator gen, SerializationContext context) {
		gen.writeStartObject();
		gen.writeStringProperty("id", value.id() == null ? null : value.id().toString());
		gen.writeStringProperty("url", browserUrl(value.url()));
		gen.writeStringProperty("alt", value.alt());
		number(gen, "width", value.width());
		number(gen, "height", value.height());
		gen.writeEndObject();
	}

	private String browserUrl(String url) {
		if (url == null || !url.startsWith(MEDIA_PATH)) {
			return url;
		}
		return storage.publicUrl(url.substring(MEDIA_PATH.length())).map(URI::toString).orElse(url);
	}

	private static void number(JsonGenerator gen, String name, Integer value) {
		if (value == null) {
			gen.writeNullProperty(name);
		}
		else {
			gen.writeNumberProperty(name, value);
		}
	}

}
