import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MovieRec — find your next favorite film",
  description: "Personalized movie recommendations based on your taste",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} h-full`}>
      <body className="min-h-full" suppressHydrationWarning>
        <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-accent">Movie</span>Rec
            </Link>
            <div className="hidden sm:flex items-center gap-5 text-sm">
              <Link href="/" className="nav-link">Browse</Link>
              <Link href="/swipe" className="nav-link">Rate</Link>
              <Link href="/recommendations" className="nav-link">Movie Recs</Link>
              <Link href="/recommendations/tv" className="nav-link">TV Recs</Link>
              <Link href="/taste" className="nav-link">My Taste</Link>
            </div>
          </div>
        </nav>
        <main className="pt-14 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
