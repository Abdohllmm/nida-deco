package ma.nidaldeco.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.nidaldeco.common.BaseEntity;

@Entity
@Table(name = "admin_users")
public class AdminUser extends BaseEntity {

	/** Toujours enregistré en minuscules. */
	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(nullable = false, length = 100)
	private String passwordHash;

	protected AdminUser() {
	}

	public AdminUser(String email, String passwordHash) {
		this.email = email;
		this.passwordHash = passwordHash;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

}
