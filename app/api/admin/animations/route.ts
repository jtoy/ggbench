import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool from '@/lib/db'

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
          a.code,
          a.created_at,
          p.text as prompt_text,
          p.tags as prompt_tags,
          m.name as model_name
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