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
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")'
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
  async redirects() {
    return [
      {
        source: '/app-release.apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/app-release.apk',
        permanent: false,
      },
      {
        source: '/download-apk',
        destination: 'https://raw.githubusercontent.com/samridh8089/smartdine-qr/main/public/app-release.apk',
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
