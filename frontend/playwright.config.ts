import { defineConfig, devices } from "@playwright/test";

// Les tests E2E s'exécutent contre une application réelle : backend lancé avec le
// profil « demo » et un administrateur existant (voir README, section Tests).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5180";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, locale: "fr-FR", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  // Démarre Vite si aucune interface ne répond déjà à l'adresse de test.
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
