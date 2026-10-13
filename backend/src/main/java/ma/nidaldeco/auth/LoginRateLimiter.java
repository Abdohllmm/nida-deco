package ma.nidaldeco.auth;

import java.time.Clock;
import java.time.Duration;

import org.springframework.stereotype.Component;

import ma.nidaldeco.common.AttemptLimiter;
import ma.nidaldeco.config.AppProperties;

/**
 * Limite les échecs de connexion par couple adresse IP + email, et plus largement
 * par adresse IP pour freiner l'essai de nombreux comptes depuis une même source.
 */
@Component
public class LoginRateLimiter {

	private static final int IP_FACTOR = 4;

	private final AttemptLimiter perAccount;

	private final AttemptLimiter perIp;

	public LoginRateLimiter(AppProperties properties) {
		Clock clock = Clock.systemUTC();
		int max = properties.security().loginMaxAttempts();
		this.perAccount = new AttemptLimiter(max, properties.security().loginWindow(), clock);
		this.perIp = new AttemptLimiter(max * IP_FACTOR, properties.security().loginWindow(), clock);
	}

	public boolean isBlocked(String ip, String email) {
		return perIp.isBlocked(ip) || perAccount.isBlocked(key(ip, email));
	}

	public void recordFailure(String ip, String email) {
		perIp.record(ip);
		perAccount.record(key(ip, email));
	}

	public void recordSuccess(String ip, String email) {
		perAccount.reset(key(ip, email));
	}

	public Duration retryAfter(String ip, String email) {
		Duration account = perAccount.retryAfter(key(ip, email));
		Duration address = perIp.isBlocked(ip) ? perIp.retryAfter(ip) : Duration.ZERO;
		return account.compareTo(address) > 0 ? account : address;
	}

	public void clear() {
		perAccount.clear();
		perIp.clear();
	}

	private static String key(String ip, String email) {
		return ip + "|" + email;
	}

}
