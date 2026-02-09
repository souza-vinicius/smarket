import { Inter } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SMarket - Analista de Compras Inteligente",
  description: "Analise suas notas fiscais e economize dinheiro com insights inteligentes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
