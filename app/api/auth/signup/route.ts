import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }
    
    try {
      const user = await createUser(username, password, false) // false = not admin
      
      return NextResponse.json({
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin
        }
      })
    } catch (error: any) {
      if (error.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 