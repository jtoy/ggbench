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
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT id, text, tags FROM prompts ORDER BY created_at DESC'
      )
      return NextResponse.json(result.rows)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { text, tags } = await request.json()
    
    if (!text) {
      return NextResponse.json(
        { error: 'Prompt text is required' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        'INSERT INTO prompts (text, tags) VALUES ($1, $2) RETURNING id, text, tags',
        [text, tags || []]
      )
      
      return NextResponse.json(result.rows[0])
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 