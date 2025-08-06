import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT id, name, api_type, api_endpoint, temperature, max_tokens, elo_score, enabled FROM models ORDER BY name'
      )
      return NextResponse.json(result.rows)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { name, api_type, api_endpoint, api_key, temperature, max_tokens, additional_headers } = await request.json()
    
    if (!name || !api_type || !api_endpoint || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO models (name, api_type, api_endpoint, api_key, temperature, max_tokens, additional_headers) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, api_type, api_endpoint, temperature, max_tokens, elo_score, enabled`,
        [name, api_type, api_endpoint, api_key, temperature, max_tokens, additional_headers]
      )
      
      return NextResponse.json(result.rows[0])
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating model:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 