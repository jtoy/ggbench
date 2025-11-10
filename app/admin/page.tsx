'use client'

import { useState, useEffect } from 'react'
import { Plus, Play, Save, Trash2, Settings } from 'lucide-react'
import Link from 'next/link'

interface Model {
  id: number
  name: string
  api_type: string
  api_endpoint?: string
  temperature: number | null
  max_tokens: number | null
  elo_score: number
  enabled: boolean
}

interface Prompt {
  id: number
  text: string
  tags: string[]
}

export default function AdminPanel() {
  const [models, setModels] = useState<Model[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedModel, setSelectedModel] = useState<number | ''>('')
  const [selectedPrompt, setSelectedPrompt] = useState<number | ''>('')
  const [framework, setFramework] = useState<'threejs' | 'p5js' | 'svg'>('p5js')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingForAll, setIsGeneratingForAll] = useState(false)
  const [isOverwritingAll, setIsOverwritingAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Edit states for selected model/prompt
  const [editModel, setEditModel] = useState({
    id: 0,
    name: '',
    api_type: '',
    api_endpoint: '',
    temperature: '',
    max_tokens: '',
    enabled: true,
  })
  const [editPrompt, setEditPrompt] = useState({
    id: 0,
    text: '',
    tags: '',
  })

  // Form states for adding new model
  const [newModel, setNewModel] = useState({
    name: '',
    api_type: '',
    api_endpoint: ''
  })

  // Form states for adding new prompt
  const [newPrompt, setNewPrompt] = useState({
    text: '',
    tags: ''
  })

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

  // Load data only if authorized
  useEffect(() => {
    if (!authChecked || !isAuthorized) return
    const initializeData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([fetchModels(), fetchPrompts()])
      } catch (error) {
        setError('Failed to load data')
        console.error('Error initializing data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    initializeData()
  }, [authChecked, isAuthorized])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/models', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setModels(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch models:', response.status)
        setModels([])
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      setModels([])
    }
  }

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/admin/prompts', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPrompts(Array.isArray(data.prompts) ? data.prompts : Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch prompts:', response.status)
        setPrompts([])
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
      setPrompts([])
    }
  }

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newModel)
      })
      
      if (response.ok) {
        setNewModel({
          name: '',
          api_type: '',
          api_endpoint: ''
        })
        fetchModels()
      }
    } catch (error) {
      console.error('Error adding model:', error)
    }
  }

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const tags = newPrompt.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      const response = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: newPrompt.text,
          tags
        })
      })
      
      if (response.ok) {
        setNewPrompt({ text: '', tags: '' })
        fetchPrompts()
      }
    } catch (error) {
      console.error('Error adding prompt:', error)
    }
  }

  useEffect(() => {
    if (selectedModel) {
      const model = models.find((m) => m.id === selectedModel)
      if (model) {
        setEditModel({
          id: model.id,
          name: model.name || '',
          api_type: model.api_type || '',
          api_endpoint: model.api_endpoint || '',
          temperature: model.temperature == null ? '' : String(model.temperature),
          max_tokens: model.max_tokens == null ? '' : String(model.max_tokens),
          enabled: model.enabled,
        })
      }
    } else {
      setEditModel({
        id: 0,
        name: '',
        api_type: '',
        api_endpoint: '',
        temperature: '',
        max_tokens: '',
        enabled: true,
      })
    }
  }, [selectedModel, models])

  const saveEditedModel = async () => {
    if (!editModel.id) return
    try {
      const response = await fetch('/api/admin/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editModel.id,
          name: editModel.name,
          api_type: editModel.api_type,
          api_endpoint: editModel.api_endpoint,
          temperature: editModel.temperature === '' ? null : Number(editModel.temperature),
          max_tokens: editModel.max_tokens === '' ? null : Number(editModel.max_tokens),
          enabled: !!editModel.enabled,
        }),
      })
      if (response.ok) {
        await fetchModels()
        alert('Model updated')
      } else {
        const err = await response.json().catch(() => ({}))
        alert(`Failed to update model${err?.error ? `: ${err.error}` : ''}`)
      }
    } catch (e) {
      console.error('Error updating model:', e)
    }
  }

  useEffect(() => {
    if (selectedPrompt) {
      const prompt = prompts.find((p) => p.id === selectedPrompt)
      if (prompt) {
        setEditPrompt({
          id: prompt.id,
          text: prompt.text || '',
          tags: Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '',
        })
      }
    } else {
      setEditPrompt({ id: 0, text: '', tags: '' })
    }
  }, [selectedPrompt, prompts])

  const saveEditedPrompt = async () => {
    if (!editPrompt.id) return
    try {
      const tagsArray = editPrompt.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t)
      const response = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editPrompt.id,
          text: editPrompt.text,
          tags: tagsArray,
        }),
      })
      if (response.ok) {
        await fetchPrompts()
        alert('Prompt updated')
      } else {
        const err = await response.json().catch(() => ({}))
        alert(`Failed to update prompt${err?.error ? `: ${err.error}` : ''}`)
      }
    } catch (e) {
      console.error('Error updating prompt:', e)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type })
    window.clearTimeout((showToast as any)._tid)
    ;(showToast as any)._tid = window.setTimeout(() => setToast(null), 4000)
  }

  const generateAnimation = async () => {
    if (!selectedModel || !selectedPrompt) {
      showToast('Please select both a model and a prompt', 'error')
      return
    }

    console.log('Generating animation with:', { modelId: selectedModel, promptId: selectedPrompt, framework })

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          modelId: selectedModel,
          promptId: selectedPrompt,
          framework: framework
        })
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Generated animation successfully, code length:', data.code?.length)
        setGeneratedCode(data.code)
        showToast(`Animation generated successfully for ${framework}!`, 'success')
      } else {
        const err = await response.json().catch(() => ({}))
        const msg = err?.error || 'Failed to generate animation'
        console.error('Generation failed:', msg, err)
        showToast(msg, 'error')
      }
    } catch (error) {
      console.error('Error generating animation:', error)
      showToast('Error generating animation: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateForAllPrompts = async () => {
    if (!selectedModel) {
      alert('Please select a model')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to generate animations for ALL prompts that don't have animations for the selected model? This may take a while.`
    )
    
    if (!confirmed) {
      return
    }

    setIsGeneratingForAll(true)
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          modelId: selectedModel,
          generateForAllPrompts: true,
          framework: framework
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setGeneratedCode('') // Clear any previous single generation
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating animations for all prompts:', error)
      alert('Error generating animations for all prompts')
    } finally {
      setIsGeneratingForAll(false)
    }
  }

  const generateForAllPromptsOverwrite = async () => {
    if (!selectedModel) {
      alert('Please select a model')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to GENERATE for ALL prompts for this model and OVERWRITE existing animations? This may take a while and cannot be undone.`
    )
    if (!confirmed) return

    setIsOverwritingAll(true)
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          modelId: selectedModel,
          overwriteAllPrompts: true,
          framework: framework
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        setGeneratedCode('')
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Error: ${errorData.error || 'Failed to generate'}`)
      }
    } catch (error) {
      console.error('Error overwriting animations for all prompts:', error)
      alert('Error overwriting animations for all prompts')
    } finally {
      setIsOverwritingAll(false)
    }
  }

  if (!authChecked || (isAuthorized && isLoading)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (authChecked && !isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Unauthorized</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">You don't have access to the admin panel.</p>
        <a href="/" className="btn-primary inline-block">Go back home</a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Please check your database connection and try again.</p>
        </div>
      </div>
    )
  }

  const handleDeleteModel = async (model: Model) => {
    const confirmed = window.confirm(
      `Delete model "${model.name}" and all its animations and votes? This cannot be undone.`
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/models?id=${model.id}` , {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        await fetchModels()
        if (selectedModel === model.id) {
          setSelectedModel('')
        }
        alert('Model deleted')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Failed to delete model${err?.error ? `: ${err.error}` : ''}`)
      }
    } catch (e) {
      console.error('Error deleting model:', e)
      alert('Error deleting model')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow text-sm ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage models, prompts, and generate animations</p>
        
        {/* Navigation Links */}
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/admin/prompts"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Prompts
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add Model Form */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center dark:text-gray-100">
            <Plus className="w-5 h-5 mr-2" />
            Add New Model
          </h2>
          <form onSubmit={handleAddModel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Model Name
              </label>
              <input
                type="text"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                className="w-full px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                API Type
              </label>
              <select
                value={newModel.api_type}
                onChange={(e) => setNewModel({ ...newModel, api_type: e.target.value })}
                className="w-full px-3 py-2"
                required
              >
                <option value="">Select API Type</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google">Google</option>
                <option value="OpenRouter">OpenRouter</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                API Endpoint
              </label>
              <input
                type="text"
                value={newModel.api_endpoint}
                onChange={(e) => setNewModel({ ...newModel, api_endpoint: e.target.value })}
                className="w-full px-3 py-2"
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Add Model
            </button>
          </form>
        </div>

        {/* Add Prompt Form */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center dark:text-gray-100">
            <Plus className="w-5 h-5 mr-2" />
            Add New Prompt
          </h2>
          <form onSubmit={handleAddPrompt} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Prompt Text
              </label>
              <textarea
                value={newPrompt.text}
                onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
                className="w-full px-3 py-2"
                rows={4}
                placeholder="Describe the animation you want to generate..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                className="w-full px-3 py-2"
                placeholder="cityscape, futuristic, neon"
              />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Add Prompt
            </button>
          </form>
        </div>
      </div>

      {/* Generation Console */}
      <div className="card mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center dark:text-gray-100">
          <Settings className="w-5 h-5 mr-2" />
          Animation Generation Console
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Select Model
            </label>
                         <select
               value={selectedModel}
               onChange={(e) => setSelectedModel(e.target.value ? parseInt(e.target.value) : '')}
               className="w-full px-3 py-2"
             >
               <option value="">Choose a model</option>
               {Array.isArray(models) && models.map((model) => (
                 <option key={model.id} value={model.id}>
                   {model.name} ({model.api_type})
                 </option>
               ))}
             </select>
            {/* Auto-populated from DB on selection */}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Select Prompt
            </label>
                         <select
               value={selectedPrompt}
               onChange={(e) => setSelectedPrompt(e.target.value ? parseInt(e.target.value) : '')}
               className="w-full px-3 py-2"
             >
               <option value="">Choose a prompt</option>
               {Array.isArray(prompts) && prompts.map((prompt) => (
                 <option key={prompt.id} value={prompt.id}>
                   {prompt.text.substring(0, 50)}...
                 </option>
               ))}
             </select>
            {/* Auto-populated from DB on selection */}
          </div>
        </div>

        {/* Edit Model */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Model</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Name</label>
              <input
                type="text"
                value={editModel.name}
                onChange={(e) => setEditModel({ ...editModel, name: e.target.value })}
                className="w-full px-3 py-2"
                placeholder="Model name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">API Type</label>
              <select
                value={editModel.api_type}
                onChange={(e) => setEditModel({ ...editModel, api_type: e.target.value })}
                className="w-full px-3 py-2"
              >
                <option value="">Select API Type</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google">Google</option>
                <option value="OpenRouter">OpenRouter</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">API Endpoint</label>
              <input
                type="text"
                value={editModel.api_endpoint}
                onChange={(e) => setEditModel({ ...editModel, api_endpoint: e.target.value })}
                className="w-full px-3 py-2"
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Temperature</label>
                <input
                  type="number"
                  step="0.01"
                  value={editModel.temperature}
                  onChange={(e) => setEditModel({ ...editModel, temperature: e.target.value })}
                  className="w-full px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Max Tokens</label>
                <input
                  type="number"
                  value={editModel.max_tokens}
                  onChange={(e) => setEditModel({ ...editModel, max_tokens: e.target.value })}
                  className="w-full px-3 py-2"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="model-enabled"
                type="checkbox"
                checked={!!editModel.enabled}
                onChange={(e) => setEditModel({ ...editModel, enabled: e.target.checked })}
              />
              <label htmlFor="model-enabled" className="text-sm text-gray-700 dark:text-gray-300">Enabled</label>
            </div>
            <div>
              <button
                onClick={saveEditedModel}
                disabled={!editModel.id}
                className="btn-primary"
              >
                Save Model Changes
              </button>
            </div>
          </div>

          {/* Edit Prompt */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Prompt</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Text</label>
              <textarea
                value={editPrompt.text}
                onChange={(e) => setEditPrompt({ ...editPrompt, text: e.target.value })}
                className="w-full px-3 py-2"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tags (comma-separated)</label>
              <input
                type="text"
                value={editPrompt.tags}
                onChange={(e) => setEditPrompt({ ...editPrompt, tags: e.target.value })}
                className="w-full px-3 py-2"
              />
            </div>
            <div>
              <button
                onClick={saveEditedPrompt}
                disabled={!editPrompt.id}
                className="btn-primary"
              >
                Save Prompt Changes
              </button>
            </div>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Framework Selection</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Select which framework to use for code generation. All frameworks work with all prompts - choose the one that best fits your needs.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Framework:
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as 'threejs' | 'p5js' | 'svg')}
              className="px-4 py-2 border border-blue-300 rounded-md bg-white dark:bg-gray-800 dark:border-blue-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="p5js">p5.js (Canvas 2D)</option>
              <option value="threejs">Three.js (WebGL 3D)</option>
              <option value="svg">SVG (Vector Graphics)</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-start items-center gap-4 flex-wrap mt-4 sm:mt-6 mb-8">
          <button
            onClick={generateAnimation}
            disabled={isGenerating || isGeneratingForAll || !selectedModel || !selectedPrompt}
            className="btn-primary inline-flex items-center h-11 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Animation'}
          </button>
          
          <button
            onClick={generateForAllPrompts}
            disabled={isGenerating || isGeneratingForAll || !selectedModel}
            className="btn-secondary inline-flex items-center h-11 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 mr-2" />
            {isGeneratingForAll ? 'Generating for All...' : 'Generate for All Prompts'}
          </button>

          <button
            onClick={generateForAllPromptsOverwrite}
            disabled={isGenerating || isGeneratingForAll || isOverwritingAll || !selectedModel}
            className="btn-danger inline-flex items-center h-11 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 mr-2" />
            {isOverwritingAll ? 'Overwriting All...' : 'Generate for All Prompts (Overwrite)'}
          </button>
        </div>
        
        {generatedCode && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">Generated Code</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{generatedCode}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Models List */}
      <div className="card mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 dark:text-gray-100">Current Models</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">API Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">API Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">ELO Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
               {Array.isArray(models) && models.map((model) => (
                 <tr key={model.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <Link className="text-primary-600 hover:underline" href={`/admin/model_gallery/${model.id}`}>
                       {model.name}
                     </Link>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                     {model.api_type}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                     {model.api_endpoint || '-'}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                     {model.enabled ? model.elo_score || 1000 : 'Disabled'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                       model.enabled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                     }`}>
                       {model.enabled ? 'Active' : 'Disabled'}
                     </span>
                 </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleDeleteModel(model)}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete model"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 