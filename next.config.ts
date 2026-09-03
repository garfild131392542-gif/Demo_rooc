import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    qualities: [75, 95],
  },
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],
  async headers() {
    return [
      {
        // ⚡ Cache static job icons and assets permanently on Vercel CDN (0 CPU time)
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // ⚡ Cache public images and icons
        source: '/:all*(png|jpg|jpeg|gif|webp|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
