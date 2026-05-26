import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "God's Chai Operations",
    short_name: "God's Chai",
    description: "Restaurant operations: inventory, labor, cash, reporting.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e293b",
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
