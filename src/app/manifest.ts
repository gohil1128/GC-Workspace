import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "God's Chai Operations",
    short_name: "God's Chai",
    description: "Sales, invoices, cash and labor for every event.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Match the cream canvas so the splash and status bar don't flash slate.
    background_color: "#F8F4EC",
    theme_color: "#F8F4EC",
    categories: ["business", "productivity", "finance"],
    // Real square assets on the cream plate. Previously all three entries
    // pointed at one 300x290 transparent PNG, so the declared sizes were false
    // and the maskable variant overflowed Android's safe zone.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New invoice", short_name: "Invoice", url: "/purchasing/invoices/new" },
      { name: "New cash close", short_name: "Cash", url: "/cash/new" },
      { name: "Reports", short_name: "Reports", url: "/reports" },
    ],
  };
}
