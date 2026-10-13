package ma.nidaldeco.auth;

import java.io.Serializable;
import java.util.UUID;

/** Identité conservée dans la session serveur. Ne contient aucun secret. */
public record AdminPrincipal(UUID id, String email) implements Serializable {
}
