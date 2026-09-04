import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// The manifest and service-worker script MUST be publicly readable: a manifest
// is fetched with credentials omitted (so an auth redirect yields login HTML and
// the app becomes uninstallable), and a SW script request is redirect:"error"
// (so a 307 fails registration). Neither contains private data.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/api/auth",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
];

export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
