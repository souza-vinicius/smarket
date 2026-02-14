/**
 * Helpers for dynamic route params in static export (Capacitor) builds.
 *
 * Next.js static export generates a single fallback page per dynamic segment
 * (e.g. /invoices/_/index.html). We pass the real ID as a query param (?id=...)
 * so the fallback page can read it regardless of server configuration.
 *
 * Works in both standalone (SSR) and static export modes.
 */

/**
 * Build a URL for a dynamic route. Passes the real ID as a query param.
 *
 * @example
 *   dynamicRoute("/invoices/review", processingId)
 *   // → "/invoices/review/_/?id={processingId}"
 *
 *   dynamicRoute("/invoices", invoiceId, "/edit")
 *   // → "/invoices/_/edit/?id={invoiceId}"
 */
export function dynamicRoute(basePath: string, id: string, suffix = ""): string {
  return `${basePath}/_${suffix}/?id=${encodeURIComponent(id)}`;
}

/**
 * Read a dynamic route param. Checks (in order):
 * 1. Query param ?id= (works in static export and standalone)
 * 2. Next.js useParams() value (works in standalone SSR)
 *
 * @param paramsValue - The value from useParams() (e.g. params.invoiceId)
 */
export function readDynamicParam(paramsValue: string | string[] | undefined): string {
  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get("id");
    if (queryId) {
      return queryId;
    }
  }
  const val = Array.isArray(paramsValue) ? paramsValue[0] : paramsValue;
  return val && val !== "_" ? val : "";
}
