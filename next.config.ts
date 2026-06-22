import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allowed dev origins for HMR and WebSocket connections over secure tunnels like ngrok */
  allowedDevOrigins: [
    "localhost:3000",
    "sarcasm-expansion-street.ngrok-free.dev"
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://api.vahan.parivahan.gov.in ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:*;",
          }
        ],
      },
    ];
  },
};

export default nextConfig;
