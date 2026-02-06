import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large libraries to reduce main-thread work and TBT
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return undefined; // Keep in main bundle
            }
            // Heavy animation/libs - load only on pages that need them (reduces TBT on initial load)
            if (id.includes("gsap")) return "gsap";
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("leaflet") || id.includes("react-leaflet")) return "leaflet";
            if (id.includes("three") || id.includes("postprocessing") || id.includes("face-api")) return "three-effects";
            if (id.includes("react-router")) return "react-router";
            if (id.includes("@radix-ui")) return "radix-ui";
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("@stripe")) return "stripe";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf-utils";
            if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "forms";
            if (id.includes("date-fns")) return "date-utils";
            if (id.includes("lucide-react") || id.includes("react-icons")) return "icons";
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings for reasonable chunks
  },
}));
