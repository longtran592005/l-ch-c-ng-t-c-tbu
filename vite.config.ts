import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Bind tất cả interfaces để có thể truy cập từ LAN
    port: 8080,
    // HTTPS với SSL certificate từ mkcert
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "ssl/key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "ssl/cert.pem")),
    },
    // Proxy để gộp tất cả services vào 1 port
    proxy: {
      // Backend API - /api/* -> https://localhost:3000/api/*
      '/api': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: false, // cho phép self-signed cert
      },
      // RAG Chatbot Service - /rag/* -> https://localhost:8002/*
      '/rag': {
        target: 'https://localhost:8002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rag/, ''),
      },
      // Python Whisper Service - /whisper/* -> https://localhost:8081/*
      '/whisper': {
        target: 'https://localhost:8081',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/whisper/, ''),
      },
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
