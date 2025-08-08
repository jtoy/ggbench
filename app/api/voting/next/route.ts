import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const client = await pool.connect()
    try {
      // Get a random pair of animations that haven't been compared yet
      const result = await client.query(`
        WITH model_vote_counts AS (
          SELECT model_id, COUNT(*) AS vote_count
          FROM (
            SELECT a.model_id
            FROM votes v
            JOIN animations a ON a.id = v.animation_a_id
            UNION ALL
            SELECT b.model_id
            FROM votes v
            JOIN animations b ON b.id = v.animation_b_id
          ) t
          GROUP BY model_id
        ),
        animation_pairs AS (
          SELECT 
            a1.id as animation_a_id,
            a2.id as animation_b_id,
            p.text as prompt,
            a1.code as code_a,
            a2.code as code_b,
            m1.name as model_a_name,
            m2.name as model_b_name,
            m1.id as model_a_id,
            m2.id as model_b_id,
            COALESCE(mc1.vote_count, 0) AS model_a_votes,
            COALESCE(mc2.vote_count, 0) AS model_b_votes
          FROM animations a1
          CROSS JOIN animations a2
          JOIN prompts p ON a1.prompt_id = p.id
          JOIN models m1 ON a1.model_id = m1.id
          JOIN models m2 ON a2.model_id = m2.id
          LEFT JOIN model_vote_counts mc1 ON mc1.model_id = m1.id
          LEFT JOIN model_vote_counts mc2 ON mc2.model_id = m2.id
          WHERE a1.id < a2.id
          AND a1.prompt_id = a2.prompt_id
          AND m1.enabled = true
          AND m2.enabled = true
          AND NOT EXISTS (
            SELECT 1 FROM votes v 
            WHERE (v.animation_a_id = a1.id AND v.animation_b_id = a2.id)
            OR (v.animation_a_id = a2.id AND v.animation_b_id = a1.id)
          )
        )
        SELECT * FROM animation_pairs
        ORDER BY (model_a_votes + model_b_votes) ASC, RANDOM()
        LIMIT 1
      `)
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'No more comparisons available' },
          { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
        )
      }
      
      const row = result.rows[0]
      
      return NextResponse.json({
        id: `${row.animation_a_id}-${row.animation_b_id}`,
        prompt: row.prompt,
        animationA: {
          id: row.animation_a_id,
          code: row.code_a,
          model: {
            id: row.model_a_id,
            name: row.model_a_name
          }
        },
        animationB: {
          id: row.animation_b_id,
          code: row.code_b,
          model: {
            id: row.model_b_id,
            name: row.model_b_name
          }
        }
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching next comparison:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  }
} 