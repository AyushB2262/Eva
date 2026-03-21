import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Recommended for R3F to avoid double renders in dev
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};


export default nextConfig;
