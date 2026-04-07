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
  title: "DrapXi — Cloud R2 Storage Manager",
  description: "A high-performance, secure Cloudflare R2 dashboard. Effortlessly manage, upload, and organize your cloud assets with a professional storage interface.",
  openGraph: {
    title: "DrapXi — Cloud R2 Storage Manager",
    description: "Manage, upload, and organize your Cloudflare R2 assets with a professional, secure dashboard.",
    url: "https://drapxi.site",
    siteName: "DrapXi R2",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "DrapXi R2 Manager Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DrapXi — Cloud R2 Storage Manager",
    description: "Cloud storage reimagined with Cloudflare R2 and DrapXi.",
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
