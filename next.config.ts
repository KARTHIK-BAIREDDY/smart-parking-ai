import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allowed dev origins for HMR and WebSocket connections over secure tunnels like ngrok */
  allowedDevOrigins: [
    "localhost:3000",
    "sarcasm-expansion-street.ngrok-free.dev"
  ]
};

export default nextConfig;