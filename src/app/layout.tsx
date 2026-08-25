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
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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
        <link rel="icon" href="/favicon.ico?v=20260811" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260811" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260811" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=20260811" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260811" />
        <link rel="shortcut icon" href="/favicon.ico?v=20260811" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined') {
                    var CURRENT_VERSION = "2026-08-01-v3";
                    var storedVersion = localStorage.getItem('smartdine_app_version');
                    if (storedVersion !== CURRENT_VERSION) {
                      localStorage.setItem('smartdine_app_version', CURRENT_VERSION);
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(function(registrations) {
                          for(var i = 0; i < registrations.length; i++) {
                            registrations[i].unregister();
                          }
                        });
                      }
                      if ('caches' in window) {
                        caches.keys().then(function(names) {
                          for (var j = 0; j < names.length; j++) {
                            caches.delete(names[j]);
                          }
                        });
                      }
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
