import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Recommended for R3F to avoid double renders in dev
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  experimental: {
    // @ts-ignore - turbopack config might not be fully typed in the latest definition
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
