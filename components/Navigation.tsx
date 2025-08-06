'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Vote, Info, User, LogIn, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const navItems = [
    { href: '/voting', label: 'Voting', icon: Vote },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/about', label: 'About', icon: Info },
  ]

  // Add admin panel link for admin users
  if (user?.is_admin) {
    navItems.push({ href: '/admin', label: 'Admin Panel', icon: Settings })
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-xl font-bold text-gray-900">GGBench</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Welcome, {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden sm:flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Up</span>
                </Link>
                <Link href="/login" className="flex items-center space-x-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 