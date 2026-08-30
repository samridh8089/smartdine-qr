import type { NextConfig } from "next";

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
