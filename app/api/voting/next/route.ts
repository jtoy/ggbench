import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getJson, setJson } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const framework = searchParams.get('framework') || 'p5js'
    
    if (!['threejs', 'p5js', 'svg'].includes(framework)) {
      return NextResponse.json(
        { error: 'Invalid framework. Must be one of: threejs, p5js, svg' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      // Get a random pair of animations that haven't been compared yet and have the same framework
      const result = await client.query(`
        WITH animation_pairs AS (
          SELECT 
            a1.id as animation_a_id,
            a2.id as animation_b_id,
            p.text as prompt,
            a1.code as code_a,
            a2.code as code_b,
            a1.framework,
            m1.name as model_a_name,
            m2.name as model_b_name,
            m1.id as model_a_id,
            m2.id as model_b_id
          FROM animations a1
          CROSS JOIN animations a2
          JOIN prompts p ON a1.prompt_id = p.id
          JOIN models m1 ON a1.model_id = m1.id
          JOIN models m2 ON a2.model_id = m2.id
          WHERE a1.id < a2.id
          AND a1.prompt_id = a2.prompt_id
          AND a1.framework = a2.framework
          AND a1.framework = $1
          AND m1.enabled = true
          AND m2.enabled = true
          AND NOT EXISTS (
            SELECT 1 FROM votes v 
            WHERE (v.animation_a_id = a1.id AND v.animation_b_id = a2.id)
            OR (v.animation_a_id = a2.id AND v.animation_b_id = a1.id)
          )
        )
        SELECT * FROM animation_pairs
        ORDER BY RANDOM()
        LIMIT 1
      `, [framework])
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'No more comparisons available' },
          { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
        )
      }
      
      const row = result.rows[0]

      // Try to load animation details from Redis cache; if missing, use DB row and backfill cache
      const keyA = `animation:${row.animation_a_id}`
      const keyB = `animation:${row.animation_b_id}`
      type AnimationCache = {
        id: number
        code: string
        framework: string
        model: { id: number; name: string }
      }

      const [cachedA, cachedB] = await Promise.all([
        getJson<AnimationCache>(keyA),
        getJson<AnimationCache>(keyB),
      ])

      const animationA: AnimationCache =
        cachedA ?? {
          id: row.animation_a_id,
          code: row.code_a,
          framework: row.framework,
          model: { id: row.model_a_id, name: row.model_a_name },
        }

      const animationB: AnimationCache =
        cachedB ?? {
          id: row.animation_b_id,
          code: row.code_b,
          framework: row.framework,
          model: { id: row.model_b_id, name: row.model_b_name },
        }

      // Cache miss backfill with 30-day TTL
      const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30
      const setOps: Promise<void>[] = []
      if (!cachedA) setOps.push(setJson(keyA, animationA, THIRTY_DAYS_SECONDS))
      if (!cachedB) setOps.push(setJson(keyB, animationB, THIRTY_DAYS_SECONDS))
      if (setOps.length) {
        await Promise.all(setOps)
      }

      return NextResponse.json(
        {
          id: `${row.animation_a_id}-${row.animation_b_id}`,
          prompt: row.prompt,
          framework: framework,
          animationA,
          animationB,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
      )
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