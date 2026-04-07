import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "R2 Data Node — Cloudflare R2 Manager",
  description: "Open-source, premium Cloudflare R2 management dashboard. Securely manage, upload, and synchronize your cloud storage with zero configuration.",
  openGraph: {
    title: "R2 Data Node — Cloudflare R2 Manager",
    description: "Securely manage, upload, and synchronize your Cloudflare R2 assets with a premium open-source dashboard.",
    url: "https://github.com/lakshan-bandara/Cloudflare-R2-Upload",
    siteName: "R2 Data Node",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "R2 Data Node Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "R2 Data Node — Cloudflare R2 Manager",
    description: "Cloud storage reimagined with Cloudflare R2 and R2 Data Node.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
