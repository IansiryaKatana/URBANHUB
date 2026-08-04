import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    // 8080 is often in Windows Hyper-V excluded ranges → EACCES; 5173 is the usual Vite port.
    host: true,
    port: 5173,
    strictPort: false,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Photo Sphere Viewer and GridScan must share one three instance, otherwise
    // objects built by one copy crash the other copy's WebGLRenderer.
    dedupe: ["react", "react-dom", "react-router", "react-router-dom", "three"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "three"],
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
            // Photo Sphere Viewer ships separately from the decorative three-effects
            // chunk; both import the same shared three module.
            if (id.includes("photo-sphere-viewer")) return "vr-tour";
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
