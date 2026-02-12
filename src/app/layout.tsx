import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "Shared Light — Atlas",
  description: "Constraint-driven infrastructure for coherent human coordination",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shared Light",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-200`}
      >
        <AuthProvider>
          <LanguageProvider>
            <div className="flex h-screen">
              <Sidebar />
              {/* Main content: offset on mobile for the fixed header */}
              <main className="flex-1 overflow-hidden pt-14 md:pt-0">
                {children}
              </main>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
