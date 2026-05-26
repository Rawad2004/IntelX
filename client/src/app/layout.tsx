import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IntelX | Behavioral Football Intelligence",
  description: "Decode match behavior with AI-powered behavioral signals. IntelX models how matches behave—momentum, pressure, and patterns that traditional stats miss.",
  keywords: ["football analytics", "soccer intelligence", "behavioral analysis", "match prediction"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <html lang="en" className={inter.className}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}