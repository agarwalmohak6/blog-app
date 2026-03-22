// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy API calls to FastAPI during development to avoid CORS
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    // Code-split chunks >500kB into separate files
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          "vendor-react":  ["react", "react-dom"],
          "vendor-redux":  ["@reduxjs/toolkit", "react-redux"],
          "vendor-router": ["react-router-dom"],
          "vendor-zustand": ["zustand"],
        },
      },
    },
  },
  // Optimise Vite's dependency pre-bundling
  optimizeDeps: {
    include: ["react", "react-dom", "@reduxjs/toolkit", "react-redux", "react-router-dom", "zustand"],
  },
});
