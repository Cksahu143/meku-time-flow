import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Root element not found — cannot mount EDAS');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Register Service Worker for PWA persistence ──
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  if (!isInIframe && !isPreviewHost) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").then((reg) => {
        console.log("[SW] Registered:", reg.scope);
        // Check for updates every 60s
        setInterval(() => reg.update(), 60 * 1000);
      }).catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
    });
  }
}
