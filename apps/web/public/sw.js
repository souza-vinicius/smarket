// Service Worker for Capacitor static export
// Handles dynamic route navigation by serving pre-rendered fallback files
// Dynamic routes in Next.js static export only generate files for paths
// returned by generateStaticParams (e.g., /invoices/_/). This SW intercepts
// requests for real IDs (e.g., /invoices/123/) and serves the _ fallback.

console.log('[SW] Service Worker loaded');

const DYNAMIC_ROUTES = [
  {
    // /invoices/{id}/ or /invoices/{id}/index.html or /invoices/{id}/index.txt
    pattern: /^\/invoices\/(?!_|add|review|index\.)([^/]+)(\/|\/index\.html|\/index\.txt)?$/,
    fallback: '/invoices/_/',
  },
  {
    // /invoices/{id}/edit/ or .html or .txt
    pattern: /^\/invoices\/(?!_|add|review|index\.)([^/]+)\/edit(\/|\/index\.html|\/index\.txt)?$/,
    fallback: '/invoices/_/edit/',
  },
  {
    // /invoices/review/{id}/ or .html or .txt
    pattern: /^\/invoices\/review\/(?!_|index\.)([^/]+)(\/|\/index\.html|\/index\.txt)?$/,
    fallback: '/invoices/review/_/',
  },
];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  for (const route of DYNAMIC_ROUTES) {
    if (route.pattern.test(pathname)) {
      console.log('[SW] Matched:', pathname);

      // Determine file type: .txt (RSC payload) or .html
      let fallbackFile;
      if (pathname.endsWith('.txt')) {
        fallbackFile = route.fallback + 'index.txt';
      } else {
        fallbackFile = route.fallback + 'index.html';
      }

      console.log('[SW] Serving fallback:', fallbackFile);
      const fallbackUrl = new URL(fallbackFile, url.origin);
      event.respondWith(fetch(fallbackUrl));
      return;
    }
  }
});

// Take control immediately on install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing');
  self.skipWaiting();
});

// Claim all clients immediately on activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(self.clients.claim());
});

console.log('[SW] Event listeners registered');
