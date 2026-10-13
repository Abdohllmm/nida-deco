package ma.nidaldeco.contact;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import ma.nidaldeco.common.BaseEntity;

@Entity
@Table(name = "contact_requests")
public class ContactRequest extends BaseEntity {

	public enum NeedType {
		AMENAGEMENT, CUISINE, DRESSING_PLACARD, CHAMBRE, MOBILIER, MENUISERIE, PRODUIT, AUTRE
	}

	public enum Status {
		NEW, IN_PROGRESS, DONE
	}

	@Column(nullable = false, length = 120)
	private String name;

	@Column(nullable = false, length = 30)
	private String phone;

	@Column(length = 254)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 40)
	private NeedType needType;

	@Column(nullable = false, columnDefinition = "text")
	private String message;

	@Column(length = 160)
	private String location;

	@Column(length = 80)
	private String budget;

	@Column(nullable = false)
	private boolean consent;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Status status = Status.NEW;

	protected ContactRequest() {
	}

	public ContactRequest(String name, String phone, String email, NeedType needType, String message,
			String location, String budget, boolean consent) {
		this.name = name;
		this.phone = phone;
		this.email = email;
		this.needType = needType;
		this.message = message;
		this.location = location;
		this.budget = budget;
		this.consent = consent;
	}

	public String getLocation() {
		return location;
	}

	public String getBudget() {
		return budget;
	}

	public boolean isConsent() {
		return consent;
	}

	public String getName() {
		return name;
	}

	public String getPhone() {
		return phone;
	}

	public String getEmail() {
		return email;
	}

	public NeedType getNeedType() {
		return needType;
	}

	public String getMessage() {
		return message;
	}

	public Status getStatus() {
		return status;
	}

	public void setStatus(Status status) {
		this.status = status;
	}

}
