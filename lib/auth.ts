import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getCookie } from 'cookies-next'
import pool from './db'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface User {
  id: number
  username: string
  is_admin: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User
    return decoded
  } catch {
    return null
  }
}

export async function loginUser(username: string, password: string): Promise<User | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT id, username, password, is_admin FROM users WHERE username = $1',
      [username]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0]
    const isValid = await verifyPassword(password, user.password)
    
    if (!isValid) {
      return null
    }
    
    return {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    }
  } finally {
    client.release()
  }
}

export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  try {
    let token: string | undefined
    
    if (request) {
      // If we have a request object, get token from cookies
      token = request.cookies.get('token')?.value
    } else {
      // Fallback to cookies-next for client-side
      try {
        token = getCookie('token') as string
      } catch (error) {
        // If cookies-next fails (e.g., on server side), return null
        console.warn('Failed to get token from cookies-next:', error)
        return null
      }
    }
    
    if (!token) {
      return null
    }
    
    return verifyToken(token)
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function createUser(username: string, password: string, isAdmin: boolean = false): Promise<User> {
  const client = await pool.connect()
  try {
    const hashedPassword = await hashPassword(password)
    const result = await client.query(
      'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hashedPassword, isAdmin]
    )
    
    return result.rows[0]
  } finally {
    client.release()
  }
} 