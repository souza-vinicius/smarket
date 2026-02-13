/**
 * Client-side route handler for Capacitor static export
 *
 * Next.js static export with dynamic routes only generates files for paths
 * in generateStaticParams (e.g., /invoices/_/). When navigating to actual
 * IDs (e.g., /invoices/123/), we need to rewrite the URL to use the fallback
 * route while preserving the actual ID in the pathname for useParams().
 *
 * This approach works by:
 * 1. Intercepting router.push() calls via monkey-patching
 * 2. Rewriting dynamic route URLs to use fallback routes client-side
 * 3. Letting Next.js App Router handle the navigation normally
 */

const DYNAMIC_ROUTE_MAPPINGS = [
  // /invoices/[id] -> /invoices/_
  {
    pattern: /^\/invoices\/(?!_$|add$|review\/|index\.)([^/]+)\/?$/,
    rewrite: (match: RegExpMatchArray) => `/invoices/_/`
  },
  // /invoices/[id]/edit -> /invoices/_/edit
  {
    pattern: /^\/invoices\/(?!_$|add$|review\/|index\.)([^/]+)\/edit\/?$/,
    rewrite: (match: RegExpMatchArray) => `/invoices/_/edit/`
  },
  // /invoices/review/[id] -> /invoices/review/_
  {
    pattern: /^\/invoices\/review\/(?!_$|index\.)([^/]+)\/?$/,
    rewrite: (match: RegExpMatchArray) => `/invoices/review/_/`
  },
];

/**
 * Rewrites a dynamic route URL to its static fallback
 * Returns the original URL if no mapping matches
 */
export function rewriteDynamicRoute(url: string): string {
  for (const mapping of DYNAMIC_ROUTE_MAPPINGS) {
    const match = url.match(mapping.pattern);
    if (match) {
      const rewritten = mapping.rewrite(match);
      console.log('[RouteHandler] Rewriting:', url, '→', rewritten);
      return rewritten;
    }
  }
  return url;
}

/**
 * Checks if a URL is a dynamic route that needs rewriting
 */
export function isDynamicRoute(url: string): boolean {
  return DYNAMIC_ROUTE_MAPPINGS.some(mapping => mapping.pattern.test(url));
}
