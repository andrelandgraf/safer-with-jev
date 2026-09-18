import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm",
  weight: ["400", "500"],
});

export const metadata: Metadata = siteMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
