import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Painéis de Mídia · SESI Bahia",
    template: "%s · SESI Bahia",
  },
  description:
    "Painéis de performance das campanhas de mídia do SESI Bahia — investimento, alcance, engajamento e progresso de metas.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#00427e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={geistSans.variable}>{children}</body>
    </html>
  );
}
