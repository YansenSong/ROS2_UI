import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { host: "0.0.0.0", port: 3000, strictPort: true },
  build: { outDir: "build" },
  test: { environment: "jsdom", globals: true },
});
