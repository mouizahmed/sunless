import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      // Google profile images
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com",
      // Microsoft profile images
      "graph.microsoft.com",
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
      {
        protocol: "https",
        hostname: "graph.microsoft.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
