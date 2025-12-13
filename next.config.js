/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['comicvine.gamespot.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'comicvine.gamespot.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig

