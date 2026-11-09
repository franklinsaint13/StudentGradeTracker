import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The proxy sends /api requests to the Flask server, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
