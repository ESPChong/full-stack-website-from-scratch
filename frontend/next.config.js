const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..'),
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig