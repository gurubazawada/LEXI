import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: ['*',
    '*.ngrok-free.dev/',
    'https://localhost:3000'
  ], // Add your dev origin here
  reactStrictMode: false,
};

export default nextConfig;
