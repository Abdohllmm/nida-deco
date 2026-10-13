import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backend = env.VITE_API_PROXY_TARGET || "http://localhost:8080";
  // Même origine côté navigateur : le cookie de session et le jeton CSRF fonctionnent
  // sans CORS, exactement comme en production derrière un seul domaine.
  const proxy = Object.fromEntries(
    ["/api", "/media", "/sitemap.xml", "/robots.txt"].map((path) => [path, { target: backend, changeOrigin: false }]),
  );
  return {
    plugins: [react(), tailwindcss()],
    server: { port: Number(env.VITE_DEV_PORT) || 5180, strictPort: true, proxy },
    preview: { port: Number(env.VITE_DEV_PORT) || 5180, strictPort: true, proxy },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
    },
  };
});
