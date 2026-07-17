import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "URL Shortener — Cache-First Redirect Engine",
  description: "Production-ready URL shortener with Redis cache-first redirection and async click analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 700, color: 'var(--fg)', textDecoration: 'none', fontSize: '1rem' }}>URL Shortener</Link>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </header>
        <main style={{ padding: '2rem 1rem', maxWidth: '64rem', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}