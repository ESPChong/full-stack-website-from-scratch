/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: '/app',

  turbopack: {
    root: '/app',
  },
}

module.exports = nextConfig