/**
 * API endpoint для проверки статуса системы Metron
 * GET /api/metron/status
 */

import { NextResponse } from 'next/server'
import { getCacheStats } from '@/lib/metron-api'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const CACHE_INDEX_FILE = path.join(process.cwd(), 'data', 'metron-cache-index.json')

export async function GET() {
  try {
    const stats = getCacheStats()
    
    // Получаем информацию о файле
    let fileInfo = null
    if (fs.existsSync(CACHE_INDEX_FILE)) {
      const fileStats = fs.statSync(CACHE_INDEX_FILE)
      fileInfo = {
        size: fileStats.size,
        sizeKB: (fileStats.size / 1024).toFixed(2),
        modified: fileStats.mtime.toISOString(),
      }
    }

    // Загружаем индекс для получения lastUpdated
    let lastUpdated = null
    try {
      const indexData = fs.readFileSync(CACHE_INDEX_FILE, 'utf-8')
      const index = JSON.parse(indexData)
      lastUpdated = index.lastUpdated
    } catch (error) {
      // Игнорируем ошибки
    }

    return NextResponse.json({
      success: true,
      stats: {
        cachedCount: stats.cachedCount,
        checkedCount: stats.checkedCount,
        notFoundCount: stats.checkedCount - stats.cachedCount,
      },
      file: fileInfo,
      lastUpdated,
      recentImages: Object.entries(stats.cachedImages)
        .slice(-10)
        .map(([id, url]) => ({ id, url })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

