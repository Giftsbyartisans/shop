import { backendFaviconUrl } from "@/lib/backend-api";
import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";

const googleSansFlex = localFont({
  src: "./fonts/GoogleSansFlex.ttf",
  weight: "100 1000",
  style: "normal",
  display: "swap",
  variable: "--font-google-sans-flex",
});

export const metadata: Metadata = {
  title: "GiftsByArtisans | Thoughtful products",
  icons: { icon: { url: backendFaviconUrl(), sizes: "48x48" } },
  description: "Discover products with a personal touch. Made for thoughtful giving.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={googleSansFlex.variable}>
      <body>
        {children}
        <Script id="google-analytics-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZYL32KV31H');
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZYL32KV31H"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
