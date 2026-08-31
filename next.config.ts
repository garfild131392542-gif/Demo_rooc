import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    qualities: [75, 95],
  },
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],
};

export default nextConfig;
