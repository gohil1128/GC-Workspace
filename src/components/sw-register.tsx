"use client";
import * as React from "react";

// Registers the PWA service worker. Renders nothing.
// Runs only in the browser and only in production-style environments
// (the registration silently no-ops if /sw.js isn't reachable).
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Defer to idle so it never blocks rendering
    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
