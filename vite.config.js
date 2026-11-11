import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "docs",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/site.js",
        assetFileNames: "assets/site.[ext]",
      },
    },
  },
});
