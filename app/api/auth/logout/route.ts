import { NextResponse } from 'next/server'
import { cookies } from 'cookies-next'

export async function POST() {
  try {
    // Clear the token cookie
    cookies().delete('token')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 