// Client HTTP unique : même origine, cookie de session, jeton CSRF et erreurs normalisées.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Le serveur est injoignable (hors ligne, backend arrêté…). */
  get isNetwork() {
    return this.status === 0;
  }
}

/** Émis quand une route d'administration répond 401 : la session a expiré. */
export const SESSION_EXPIRED_EVENT = "nd:session-expired";

const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "X-XSRF-TOKEN";

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function csrfToken(forceRefresh = false): Promise<string> {
  const existing = forceRefresh ? null : readCookie(CSRF_COOKIE);
  if (existing) return existing;
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = (await response.json()) as { token: string };
  return readCookie(CSRF_COOKIE) ?? body.token;
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(
      response.status,
      body.code ?? "ERROR",
      body.message ?? "Une erreur est survenue.",
      body.fieldErrors ?? {},
    );
  } catch {
    return new ApiError(response.status, "ERROR", "Une erreur est survenue. Veuillez réessayer.");
  }
}

type Body = Record<string, unknown> | FormData | undefined;

/**
 * Délai maximal d'une requête sans fichier. Sans lui, une réponse qui n'arrive jamais (connexion
 * coupée en cours de route) laisserait la page en chargement indéfiniment, sans message ni bouton
 * « Réessayer ». Les envois de fichiers n'ont pas de délai : ils peuvent être longs sur une
 * connexion lente. 15 s laisse une marge de 2 : la réponse légitime la plus lente mesurée via
 * Internet (premier appel après démarrage du serveur) est de 7,4 s.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

function networkError(error: unknown): ApiError {
  return error instanceof DOMException && error.name === "TimeoutError"
    ? new ApiError(0, "TIMEOUT", "Le serveur met trop de temps à répondre. Veuillez réessayer.")
    : new ApiError(0, "NETWORK", "Connexion au serveur impossible. Vérifiez votre connexion puis réessayez.");
}

async function request<T>(method: string, url: string, body?: Body, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit = { method, credentials: "same-origin", headers };
  let response: Response;
  try {
    if (method !== "GET") {
      headers[CSRF_HEADER] = await csrfToken(retried);
    }
    if (body instanceof FormData) {
      init.body = body;
    } else {
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      init.signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    }
    response = await fetch(url, init);
  } catch (error) {
    throw networkError(error);
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch (error) {
      // Corps interrompu (délai dépassé) ou réponse qui n'est pas du JSON.
      throw error instanceof DOMException ? networkError(error) : new ApiError(response.status, "INVALID_RESPONSE", "Réponse inattendue du serveur. Veuillez réessayer.");
    }
  }
  const error = await toError(response);
  // Jeton CSRF périmé : on en redemande un et on rejoue la requête une seule fois.
  if (error.code === "CSRF_INVALID" && !retried) {
    return request<T>(method, url, body, true);
  }
  if (error.status === 401 && url.startsWith("/api/admin")) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  throw error;
}

export function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? "?" + text : "";
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: Body) => request<T>("POST", url, body),
  put: <T>(url: string, body?: Body) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: Body) => request<T>("PATCH", url, body),
  delete: (url: string) => request<void>("DELETE", url),
};

/**
 * Nouvelles tentatives automatiques des lectures (TanStack Query). Pas de nouvelle tentative :
 * - pour une erreur « normale » (404, 401, 400…) ;
 * - pour un délai dépassé : une seconde attente de 15 s doublerait le temps passé devant un
 *   squelette ; l'erreur et le bouton « Réessayer » s'affichent donc après 15 s.
 * Une panne réseau ou serveur immédiate est réessayée deux fois (après 1 s puis 2 s).
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.code === "TIMEOUT" || (error.status >= 400 && error.status < 500))) return false;
  return failureCount < 2;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
