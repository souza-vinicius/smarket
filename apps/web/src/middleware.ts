import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware to block admin area access from native apps (WebView).
 *
 * Layer 3 of 4-layer defense-in-depth strategy:
 * 1. UI - Hide links
 * 2. Layout - Client-side redirect
 * 3. Middleware - Server-side redirect (THIS FILE)
 * 4. Backend - API rejection with 403
 */

const WEBVIEW_PATTERNS = /\b(wv|WebView|Capacitor|; wv\))\b/i;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const ua = request.headers.get("user-agent") || "";

    if (WEBVIEW_PATTERNS.test(ua)) {
      console.log("[Middleware] Blocked admin access from WebView:", ua);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
