import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT 
          a.id,
          a.model_id,
          a.prompt_id,
          a.code,
          a.framework,
          a.created_at,
          p.text AS prompt_text,
          p.tags AS prompt_tags,
          m.name AS model_name,
          -- Vote aggregates per animation
          COALESCE((
            SELECT COUNT(*) FROM votes v
            WHERE v.animation_a_id = a.id OR v.animation_b_id = a.id
          ), 0) AS total_votes,
          COALESCE((
            SELECT COUNT(*) FROM votes v
            WHERE (v.animation_a_id = a.id AND v.winner = 'A')
               OR (v.animation_b_id = a.id AND v.winner = 'B')
          ), 0) AS wins,
          COALESCE((
            SELECT COUNT(*) FROM votes v
            WHERE (v.animation_a_id = a.id AND v.winner = 'B')
               OR (v.animation_b_id = a.id AND v.winner = 'A')
          ), 0) AS losses,
          COALESCE((
            SELECT COUNT(*) FROM votes v
            WHERE (v.animation_a_id = a.id OR v.animation_b_id = a.id)
              AND v.winner = 'TIE'
          ), 0) AS ties
        FROM animations a
        JOIN prompts p ON a.prompt_id = p.id
        JOIN models m ON a.model_id = m.id
        WHERE a.model_id = $1
        ORDER BY a.created_at DESC`,
        [modelId]
      )
      
      return NextResponse.json(result.rows)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching animations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 