import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const backend = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": backend } },
  preview: { proxy: { "/api": backend } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
  },
});
