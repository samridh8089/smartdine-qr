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
  title: "CleverOps - Modern Restaurant Management & QR Ordering",
  description: "CleverOps restaurant management, KDS, waiter calling, and contactless QR ordering system.",
  icons: {
    icon: [
      { url: '/favicon.ico?v=20260901' },
      { url: '/favicon-16x16.png?v=20260901', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=20260901', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png?v=20260901', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=20260901', sizes: '180x180', type: 'image/png' },
    ],
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SmartDine" />
        <link rel="icon" href="/favicon.ico?v=20260901" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260901" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260901" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=20260901" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260901" />
        <link rel="shortcut icon" href="/favicon.ico?v=20260901" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SmartDine ServiceWorker registered:', reg.scope);
                  }).catch(function(err) {
                    console.warn('SmartDine ServiceWorker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
