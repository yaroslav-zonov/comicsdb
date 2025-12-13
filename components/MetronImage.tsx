'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getImageUrl } from '@/lib/utils'

type MetronImageProps = {
  comicvineId: number
  comicvineUrl?: string | null
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  sizes?: string
  coverAspectRatio?: '2/3' | 'auto'
}

/**
 * Компонент изображения с приоритетом Metron API
 * Сначала пытается загрузить из Metron, если не получается - использует Comicvine
 */
export default function MetronImage({
  comicvineId,
  comicvineUrl,
  alt,
  fill = false,
  width,
  height,
  className = '',
  sizes,
  coverAspectRatio,
}: MetronImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchMetronImage() {
      if (!comicvineId) {
        // Если нет comicvine ID, используем Comicvine URL
        const fallbackUrl = getImageUrl(comicvineUrl)
        if (!cancelled) {
          setImageUrl(fallbackUrl)
          setIsLoading(false)
        }
        return
      }

      try {
        // Запрашиваем изображение из Metron
        const response = await fetch(`/api/metron-image/${comicvineId}`)
        
        if (cancelled) return

        if (response.ok) {
          const data = await response.json()
          if (data.image) {
            setImageUrl(data.image)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Error fetching Metron image:', error)
      }

      // Если Metron не вернул изображение, используем Comicvine как fallback
      if (!cancelled) {
        const fallbackUrl = getImageUrl(comicvineUrl)
        setImageUrl(fallbackUrl)
        setIsLoading(false)
      }
    }

    fetchMetronImage()

    return () => {
      cancelled = true
    }
  }, [comicvineId, comicvineUrl])

  if (isLoading) {
    return (
      <div className={`relative bg-bg-tertiary ${coverAspectRatio === '2/3' ? 'aspect-[2/3]' : ''} ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-bg-secondary border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className={`relative bg-bg-tertiary ${coverAspectRatio === '2/3' ? 'aspect-[2/3]' : ''} ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-text-tertiary text-xs">Нет обложки</span>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      loading="lazy"
      unoptimized
    />
  )
}

