import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: "electron/main.ts" },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: "electron/preload.ts" },
    },
  },
  renderer: {
    root: resolve(__dirname, "ui"),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "ui/index.html") },
      },
    },
    resolve: {
      alias: { "@": resolve(__dirname, "ui/src") },
    },
  },
});
