import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
    };
    return config;
  },
};

export default nextConfig;
