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
    // Оптимизация изображений
    formats: ['image/webp'], // WebP для лучшего сжатия
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней кэш в браузере
    deviceSizes: [640, 750, 828, 1080, 1200], // Адаптивные размеры
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Размеры для srcset
    // Отключаем оптимизацию на сервере Vercel (так как картинки уже оптимизированы)
    unoptimized: false,
  },
}

module.exports = nextConfig

