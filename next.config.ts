import type { NextConfig } from "next";

// Sanitize masked environment variables from Vercel CLI / env pull
if (process.env.SUPABASE_SERVICE_ROLE_KEY === '[SENSITIVE]') {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com")'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  }
];

const nextConfig: NextConfig = {
  compress: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion']
  },
  outputFileTracingExcludes: {
    '*': [
      './assets/**',
      './base/**',
      './dist/**',
      './dist-desktop/**',
      './dist-electron/**',
      './out-electron-build/**',
      './smartdine-mobile/**',
      './docs/**',
      './e2e/**',
      './electron/**',
      './orders_audit_proof/**',
      './proofs/**',
      './qa-screenshots/**',
      './release-rc1/**',
      './release-rc2/**',
      './resources/**',
      './scratch/**',
      './scripts/**',
      './tools/**',
      './test-results/**',
      './playwright-report/**',
      './*.apk',
      './*.png',
      './*.mp4',
      './*.idsig',
      './*.xml',
      './public/*.apk',
    ],
  },
  async redirects() {
    return [
      {
        source: '/app-release.apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/CleverOps.apk',
        permanent: false,
      },
      {
        source: '/CleverOps.apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/CleverOps.apk',
        permanent: false,
      },
      {
        source: '/CleverOps-v2.2.0.apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/CleverOps.apk',
        permanent: false,
      },
      {
        source: '/download-apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/CleverOps.apk',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/dashboard/staff',
        destination: '/dashboard/settings?tab=staff',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};


export default nextConfig;
