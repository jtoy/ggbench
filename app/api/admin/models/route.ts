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
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { name, api_type, api_endpoint, temperature, max_tokens } = await request.json()
    
    if (!name || !api_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO models (name, api_type, api_endpoint, temperature, max_tokens) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, api_type, api_endpoint, temperature, max_tokens, elo_score, enabled`,
        [name, api_type, api_endpoint, temperature, max_tokens]
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

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Model id is required' },
        { status: 400 }
      )
    }

    // Build dynamic update set clauses for provided fields only
    const allowedFields = ['name', 'api_type', 'api_endpoint', 'temperature', 'max_tokens', 'enabled'] as const
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`)
        values.push(body[field])
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)

    const client = await pool.connect()
    try {
      const result = await client.query(
        `UPDATE models SET ${setClauses.join(', ')} WHERE id = $${paramIndex} 
         RETURNING id, name, api_type, api_endpoint, temperature, max_tokens, elo_score, enabled`,
        values
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(result.rows[0])
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error updating model:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Support ID in JSON body or as a query param (?id=)
    let id: number | null = null
    try {
      const body = await request.json().catch(() => null as unknown)
      if (body && typeof (body as any).id !== 'undefined') {
        id = Number((body as any).id)
      }
    } catch {
      // ignore JSON parse errors, we may have it in query params
    }

    if (!id) {
      const { searchParams } = new URL(request.url)
      const qp = searchParams.get('id')
      if (qp) id = Number(qp)
    }

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Model id is required' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Delete votes that reference any animations belonging to this model
      await client.query(
        `DELETE FROM votes v
         USING animations a
         WHERE (v.animation_a_id = a.id OR v.animation_b_id = a.id)
           AND a.model_id = $1`,
        [id]
      )

      // Delete animations for this model
      await client.query(
        `DELETE FROM animations WHERE model_id = $1`,
        [id]
      )

      // Finally delete the model itself
      const result = await client.query(
        `DELETE FROM models WHERE id = $1 RETURNING id`,
        [id]
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        )
      }

      await client.query('COMMIT')
      return NextResponse.json({ success: true })
    } catch (e) {
      await client.query('ROLLBACK')
      console.error('Error deleting model:', e)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error deleting model:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}