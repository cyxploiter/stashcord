import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/attachments/**",
      },
      // Add more patterns for production if needed
    ],
    unoptimized: false,
  },
};

export default nextConfig;
