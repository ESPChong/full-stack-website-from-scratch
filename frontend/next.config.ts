/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, './'),

  turbopack: {
    root: path.join(__dirname, './'),
  },
};

module.exports = nextConfig;