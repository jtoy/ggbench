import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getJson, setJson, isRedisEnabled } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const framework = searchParams.get('framework') || 'p5js'
    
    if (!['threejs', 'p5js', 'svg'].includes(framework)) {
      return NextResponse.json(
        { error: 'Invalid framework. Must be one of: threejs, p5js, svg' },
        { status: 400 }
      )
    }
    
    const cacheKey = `leaderboard:type:${type}:framework:${framework}`

    // Try Redis cache first
    if (isRedisEnabled()) {
      const cached = await getJson<any[]>(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }
    
    const client = await pool.connect()
    try {
      // Determine which ELO column to use based on framework
      const eloColumn = `elo_score_${framework}` as 'elo_score_threejs' | 'elo_score_p5js' | 'elo_score_svg'
      const winsColumn = `wins_${framework}` as 'wins_threejs' | 'wins_p5js' | 'wins_svg'
      const lossesColumn = `losses_${framework}` as 'losses_threejs' | 'losses_p5js' | 'losses_svg'
      const tiesColumn = `ties_${framework}` as 'ties_threejs' | 'ties_p5js' | 'ties_svg'
      
      let query = `
        SELECT 
          m.id,
          m.name,
          m.${eloColumn} as elo_score,
          m.${winsColumn} as wins,
          m.${lossesColumn} as losses,
          m.${tiesColumn} as ties,
          CASE 
            WHEN (m.${winsColumn} + m.${lossesColumn} + m.${tiesColumn}) = 0 THEN 0
            ELSE ROUND(((m.${winsColumn}::numeric / (m.${winsColumn} + m.${lossesColumn} + m.${tiesColumn})) * 100)::numeric, 1)
          END as win_rate,
          (m.${winsColumn} + m.${lossesColumn} + m.${tiesColumn}) as total_votes,
          CASE 
            WHEN m.${eloColumn} > 1000 THEN 'up'
            WHEN m.${eloColumn} < 1000 THEN 'down'
            ELSE 'stable'
          END as trend
        FROM models m
        WHERE m.enabled = true
      `
      
      // Add filtering by animation type if specified
      if (type !== 'all') {
        query += `
          AND EXISTS (
            SELECT 1 FROM animations a
            JOIN prompts p ON a.prompt_id = p.id
            WHERE a.model_id = m.id
            AND a.framework = $1
            AND $2 = ANY(p.tags)
          )
        `
      } else {
        query += `
          AND EXISTS (
            SELECT 1 FROM animations a
            WHERE a.model_id = m.id
            AND a.framework = $1
          )
        `
      }
      
      query += `
        ORDER BY m.${eloColumn} DESC, m.${winsColumn} DESC
      `
      
      const result = await client.query(query, type !== 'all' ? [framework, type] : [framework])

      // Store in Redis cache for 1 hour
      if (isRedisEnabled()) {
        await setJson(cacheKey, result.rows, 60 * 60)
      }

      return NextResponse.json(result.rows)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 