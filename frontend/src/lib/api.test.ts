import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, REQUEST_TIMEOUT_MS, api, shouldRetryQuery } from "./api";

describe("nouvelles tentatives automatiques", () => {
  it("n'enchaîne pas un second délai de 15 s : erreur et « Réessayer » après un seul délai", () => {
    expect(REQUEST_TIMEOUT_MS).toBe(15_000);
    expect(shouldRetryQuery(0, new ApiError(0, "TIMEOUT", "délai"))).toBe(false);
  });

  it("réessaie deux fois une panne immédiate, jamais une erreur 4xx", () => {
    const network = new ApiError(0, "NETWORK", "hors ligne");
    expect([0, 1, 2].map((n) => shouldRetryQuery(n, network))).toEqual([true, true, false]);
    expect(shouldRetryQuery(0, new ApiError(530, "ERROR", "tunnel"))).toBe(true);
    expect(shouldRetryQuery(0, new ApiError(404, "NOT_FOUND", "absent"))).toBe(false);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client API : délai d'attente", () => {
  it("borne chaque requête sans fichier par un délai", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await api.get("/api/public/services");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("ne limite pas la durée d'un envoi de fichier", async () => {
    document.cookie = "XSRF-TOKEN=jeton-de-test";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await api.post("/api/admin/media", new FormData());
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeUndefined();
  });

  it("transforme un délai dépassé en erreur explicite, et non en attente sans fin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("délai", "TimeoutError")));
    const error = await api.get("/api/public/settings").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("TIMEOUT");
    expect((error as ApiError).isNetwork).toBe(true);
  });

  it("signale une coupure pendant la lecture de la réponse", async () => {
    const response = new Response("{}", { status: 200 });
    vi.spyOn(response, "json").mockRejectedValue(new DOMException("délai", "TimeoutError"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const error = await api.get("/api/public/products").catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("TIMEOUT");
  });

  it("refuse une page HTML à la place du JSON attendu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html" } })));
    const error = await api.get("/api/public/projects").catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("INVALID_RESPONSE");
  });
});
