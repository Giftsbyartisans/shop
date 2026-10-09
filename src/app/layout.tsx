import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiftsByArtisans | Thoughtful gifts",
  description: "Discover gifts with a personal touch. Made for thoughtful giving.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
