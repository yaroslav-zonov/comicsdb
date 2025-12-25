/**
 * API endpoint для проверки статуса системы Metron
 * GET /api/metron/status
 */

import { NextResponse } from 'next/server'
import { getCacheStats } from '@/lib/metron-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await getCacheStats()

    return NextResponse.json({
      success: true,
      stats: {
        cachedCount: stats.cachedCount,
        checkedCount: stats.checkedCount,
        notFoundCount: stats.checkedCount - stats.cachedCount,
      },
      lastUpdated: stats.lastUpdated,
      recentImages: Object.entries(stats.cachedImages)
        .slice(-10)
        .map(([id, url]) => ({ id, url })),
      storage: process.env.KV_REST_API_URL ? 'Vercel KV' : 'In-Memory',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

