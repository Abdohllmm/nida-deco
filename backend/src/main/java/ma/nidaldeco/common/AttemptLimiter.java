package ma.nidaldeco.common;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Compteur à fenêtre fixe, en mémoire. Suffisant pour une instance unique ; à
 * remplacer par un stockage partagé si l'application est répliquée.
 */
public class AttemptLimiter {

	private static final int CLEANUP_THRESHOLD = 10_000;

	private record Window(Instant start, int count) {
	}

	private final Map<String, Window> windows = new ConcurrentHashMap<>();

	private final int maxAttempts;

	private final Duration window;

	private final Clock clock;

	public AttemptLimiter(int maxAttempts, Duration window, Clock clock) {
		this.maxAttempts = maxAttempts;
		this.window = window;
		this.clock = clock;
	}

	public boolean isBlocked(String key) {
		Window current = active(key);
		return current != null && current.count() >= maxAttempts;
	}

	public void record(String key) {
		Instant now = clock.instant();
		if (windows.size() > CLEANUP_THRESHOLD) {
			windows.values().removeIf(w -> expired(w, now));
		}
		windows.merge(key, new Window(now, 1),
				(old, fresh) -> expired(old, now) ? fresh : new Window(old.start(), old.count() + 1));
	}

	/** Enregistre une tentative si la limite n'est pas atteinte. */
	public boolean tryAcquire(String key) {
		if (isBlocked(key)) {
			return false;
		}
		record(key);
		return true;
	}

	public void reset(String key) {
		windows.remove(key);
	}

	public void clear() {
		windows.clear();
	}

	public Duration retryAfter(String key) {
		Window current = active(key);
		if (current == null) {
			return Duration.ZERO;
		}
		return Duration.between(clock.instant(), current.start().plus(window));
	}

	private Window active(String key) {
		Window current = windows.get(key);
		return current == null || expired(current, clock.instant()) ? null : current;
	}

	private boolean expired(Window w, Instant now) {
		return !now.isBefore(w.start().plus(window));
	}

}
