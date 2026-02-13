import type { Metadata, Viewport } from "next";

import { Manrope } from "next/font/google";

import "./globals.css";
import { ClientOnly } from "@/components/client-only";

import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mercado Esperto - Analista de Compras Inteligente",
    template: "%s | Mercado Esperto",
  },
  description:
    "Analise suas notas fiscais e economize dinheiro com insights inteligentes. Sua ferramenta completa para gestão de gastos.",
  keywords: [
    "notas fiscais",
    "gestão de gastos",
    "economia",
    "nfe",
    "nfce",
    "controle financeiro",
  ],
  authors: [{ name: "Mercado Esperto" }],
  creator: "Mercado Esperto",
  publisher: "Mercado Esperto",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Mercado Esperto",
    title: "Mercado Esperto - Analista de Compras Inteligente",
    description:
      "Analise suas notas fiscais e economize dinheiro com insights inteligentes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mercado Esperto - Analista de Compras Inteligente",
    description:
      "Analise suas notas fiscais e economize dinheiro com insights inteligentes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#13ec80",
      },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mercado Esperto",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#102219" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* Register service worker for dynamic route handling in Capacitor static export */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(function(reg) { console.log('[App] SW registered:', reg.scope); })
              .catch(function(err) { console.error('[App] SW registration failed:', err); });
          } else {
            console.log('[App] Service workers not supported');
          }
        `}} />
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Mercado Esperto" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mercado Esperto" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#13ec80" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${manrope.className} antialiased`}>
        <ClientOnly>
          <Providers>{children}</Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
