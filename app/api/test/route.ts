import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    return NextResponse.json({
      user,
      cookies: request.cookies.getAll(),
      hasToken: !!request.cookies.get('token')
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 