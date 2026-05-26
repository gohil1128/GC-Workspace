import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "God's Chai Operations",
  description: "Restaurant operations platform — inventory, labor, cash, reporting.",
  applicationName: "God's Chai Operations",
  appleWebApp: {
    capable: true,
    title: "God's Chai",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
