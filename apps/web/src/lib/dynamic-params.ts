/**
 * Helpers for dynamic route params in static export (Capacitor) builds.
 *
 * Next.js static export generates a single fallback page per dynamic segment
 * (e.g. /invoices/_/index.html). We pass the real ID as a query param (?id=...)
 * so the fallback page can read it regardless of server configuration.
 *
 * Works in both standalone (SSR) and static export modes.
 */

import * as React from "react";

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
 * Read a dynamic route param from Next.js router.
 * This is a client-side only helper that must be used inside useEffect or event handlers.
 *
 * For React components, use the useDynamicParam hook instead.
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

/**
 * React hook to read a dynamic route param reactively.
 * Returns the ID from query param (?id=) or useParams(), updating when the URL changes.
 *
 * @param paramsValue - The value from useParams() (e.g. params.invoiceId)
 */
export function useDynamicParam(paramsValue: string | string[] | undefined): string {
  // Use useState to force re-render when ID is available
  const [id, setId] = React.useState<string>(() => {
    // Try to get ID immediately on mount (works after navigation completes)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryId = searchParams.get("id");
      if (queryId) return queryId;
    }
    const val = Array.isArray(paramsValue) ? paramsValue[0] : paramsValue;
    return val && val !== "_" ? val : "";
  });

  React.useEffect(() => {
    // Re-read ID after mount in case it wasn't available initially
    if (!id || id === "_") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryId = searchParams.get("id");
      if (queryId && queryId !== id) {
        setId(queryId);
      } else if (paramsValue && paramsValue !== "_") {
        const val = Array.isArray(paramsValue) ? paramsValue[0] : paramsValue;
        if (val && val !== id) {
          setId(val);
        }
      }
    }
  }, [paramsValue, id]);

  return id;
}
