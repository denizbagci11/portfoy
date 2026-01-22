import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PortfolioProvider } from "@/lib/store";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dbank | Portföy Yönetimi",
  description: "Dbank Finans Takip Sistemi",
};

import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        <PortfolioProvider>
          <Navbar session={session} />
          <main className="container mx-auto px-4 pb-12">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}
