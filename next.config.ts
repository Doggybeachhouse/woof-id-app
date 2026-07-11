import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
      remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/media/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Dog profile photos allow up to 5 MB (see MAX_PHOTO_BYTES in dogs/actions.ts).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
