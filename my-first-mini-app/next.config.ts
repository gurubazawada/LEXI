import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: [
    '*',
    '*.ngrok-free.dev',
    '*.ngrok-free.dev/*',
    'https://*.ngrok-free.dev',
    'http://*.ngrok-free.dev',
    'https://localhost:3000',
    'http://localhost:3000',
  ], // Add your dev origin here
  reactStrictMode: false,
};

export default nextConfig;
