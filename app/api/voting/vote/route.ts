import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { updateModelRatings } from '@/lib/elo'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(request: NextRequest) {
  try {
    const { animationAId, animationBId, winner } = await request.json()
    
    if (!animationAId || !animationBId || !winner) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (!['A', 'B', 'TIE'].includes(winner)) {
      return NextResponse.json(
        { error: 'Invalid winner value' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      // Insert the vote
      await client.query(`
        INSERT INTO votes (animation_a_id, animation_b_id, winner)
        VALUES ($1, $2, $3)
      `, [animationAId, animationBId, winner])
      
      // Update ELO ratings
      const eloUpdate = await updateModelRatings(animationAId, animationBId, winner)
      
      return NextResponse.json({
        success: true,
        eloUpdate
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  }
} 