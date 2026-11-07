import process from "node:process";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  base: "/", // hay que cambiar al subirlo a git "/LandingPagePaperControl/",
  server: {
    watch: { usePolling: process.env.DOCKER_WATCH_POLLING === "true" },
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
});