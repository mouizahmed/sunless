import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      // Google profile images
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com",
      // Local development
      "localhost",
    ],
    // Alternative: use remotePatterns for more specific control
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
