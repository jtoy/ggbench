import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    
    const client = await pool.connect()
    try {
      let query = `
        SELECT 
          m.id,
          m.name,
          m.elo_score,
          m.wins,
          m.losses,
          m.ties,
          CASE 
            WHEN (m.wins + m.losses + m.ties) = 0 THEN 0
            ELSE ROUND(((m.wins::numeric / (m.wins + m.losses + m.ties)) * 100)::numeric, 1)
          END as win_rate,
          (m.wins + m.losses + m.ties) as total_votes,
          CASE 
            WHEN m.elo_score > 1000 THEN 'up'
            WHEN m.elo_score < 1000 THEN 'down'
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
            AND $1 = ANY(p.tags)
          )
        `
      }
      
      query += `
        ORDER BY m.elo_score DESC, m.wins DESC
      `
      
      const result = await client.query(query, type !== 'all' ? [type] : [])
      
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