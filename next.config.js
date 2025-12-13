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
    // Разрешаем загрузку изображений через наш прокси
    unoptimized: false,
  },
}

module.exports = nextConfig

