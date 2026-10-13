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
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
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
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, "NETWORK", "Connexion au serveur impossible. Vérifiez votre connexion puis réessayez.");
  }

  if (response.ok) {
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
