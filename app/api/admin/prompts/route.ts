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

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id, text, tags } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prompt id is required' },
        { status: 400 }
      )
    }
    
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    if (text !== undefined) {
      updates.push(`text = $${paramIndex++}`)
      values.push(text)
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`)
      values.push(tags)
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }
    
    values.push(id)
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        `UPDATE prompts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, text, tags`,
        values
      )
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Prompt not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(result.rows[0])
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}