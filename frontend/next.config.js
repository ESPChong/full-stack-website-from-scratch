/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..'),

  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig