'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Prompt {
  id: number
  text: string
  tags: string[]
  status: 'active' | 'inactive' | 'draft' | 'archived'
  created_at: string
}

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  
  // Edit state
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [editForm, setEditForm] = useState({
    tags: '',
    status: 'active' as 'active' | 'inactive' | 'draft' | 'archived'
  })
  const [isSaving, setIsSaving] = useState(false)

  // Check authorization first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setIsAuthorized(!!data?.user?.is_admin)
        } else {
          setIsAuthorized(false)
        }
      } catch (_) {
        setIsAuthorized(false)
      } finally {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [])

  // Load prompts only if authorized
  useEffect(() => {
    if (!authChecked || !isAuthorized) return
    fetchPrompts()
  }, [authChecked, isAuthorized])

  const fetchPrompts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prompts', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts || [])
      } else {
        setError('Failed to load prompts')
      }
    } catch (error) {
      setError('Failed to load prompts')
      console.error('Error fetching prompts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setEditForm({
      tags: prompt.tags.join(', '),
      status: prompt.status
    })
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
    setEditForm({ tags: '', status: 'active' })
  }

  const handleSaveEdit = async () => {
    if (!editingPrompt) return

    setIsSaving(true)
    try {
      const tags = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingPrompt.id,
          tags,
          status: editForm.status
        })
      })

      if (res.ok) {
        showToast('Prompt updated successfully')
        setEditingPrompt(null)
        setEditForm({ tags: '', status: 'active' })
        fetchPrompts() // Refresh the list
      } else {
        const error = await res.json().catch(() => ({}))
        showToast(error.error || 'Failed to update prompt', 'error')
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
      showToast('Error updating prompt', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authorization...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Admin
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Prompts Management</h1>
            </div>
            <Link
              href="/admin/prompts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Link>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-4 rounded-md ${
            toast.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading prompts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchPrompts}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {prompts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No prompts found.</p>
                <Link
                  href="/admin/prompts/new"
                  className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add your first prompt
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {prompts.map((prompt) => (
                  <li key={prompt.id} className="px-6 py-4">
                    {editingPrompt?.id === prompt.id ? (
                      // Edit Form
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {prompt.text}
                          </p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tags (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={editForm.tags}
                              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="tag1, tag2, tag3"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="draft">Draft</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {prompt.text}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(prompt.status)}`}>
                                {prompt.status}
                              </span>
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleEdit(prompt)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button className="text-gray-400 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center space-x-2">
                            {prompt.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Created: {new Date(prompt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
