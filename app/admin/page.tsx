'use client'

import { useState, useEffect } from 'react'
import { Plus, Play, Save, Trash2, Settings } from 'lucide-react'

interface Model {
  id: number
  name: string
  api_type: string
  api_endpoint?: string
  elo_score: number
  enabled: boolean
}

interface Prompt {
  id: number
  text: string
  tags: string[]
}

interface Animation {
  id: number
  code: string
  created_at: string
  prompt_text: string
  prompt_tags: string[]
  model_name: string
}

export default function AdminPanel() {
  const [models, setModels] = useState<Model[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedModel, setSelectedModel] = useState<number | ''>('')
  const [selectedPrompt, setSelectedPrompt] = useState<number | ''>('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModelAnimations, setSelectedModelAnimations] = useState<Animation[]>([])
  const [selectedModelForAnimations, setSelectedModelForAnimations] = useState<Model | null>(null)
  const [isLoadingAnimations, setIsLoadingAnimations] = useState(false)
  const [loadedAnimationId, setLoadedAnimationId] = useState<number | null>(null)
  const [viewingAnimation, setViewingAnimation] = useState<Animation | null>(null)

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

  useEffect(() => {
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
  }, [])

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
        setPrompts(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch prompts:', response.status)
        setPrompts([])
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
      setPrompts([])
    }
  }

  const fetchAnimationsForModel = async (modelId: number) => {
    setIsLoadingAnimations(true)
    try {
      const response = await fetch(`/api/admin/animations?modelId=${modelId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedModelAnimations(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch animations:', response.status)
        setSelectedModelAnimations([])
      }
    } catch (error) {
      console.error('Error fetching animations:', error)
      setSelectedModelAnimations([])
    } finally {
      setIsLoadingAnimations(false)
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

  const generateAnimation = async () => {
    if (!selectedModel || !selectedPrompt) {
      alert('Please select both a model and a prompt')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          modelId: selectedModel,
          promptId: selectedPrompt
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGeneratedCode(data.code)
      }
    } catch (error) {
      console.error('Error generating animation:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleModelClick = async (model: Model) => {
    setSelectedModelForAnimations(model)
    await fetchAnimationsForModel(model.id)
  }

  const loadAnimation = (animation: Animation) => {
    setGeneratedCode(animation.code)
    setLoadedAnimationId(animation.id)
    // Clear the loaded animation ID after 3 seconds
    setTimeout(() => setLoadedAnimationId(null), 3000)
    
    // Scroll to the generated code section
    setTimeout(() => {
      const generatedCodeSection = document.querySelector('[data-generated-code]')
      if (generatedCodeSection) {
        generatedCodeSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const viewAnimation = (animation: Animation) => {
    setViewingAnimation(animation)
  }

  const closeAnimationView = () => {
    setViewingAnimation(null)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage models, prompts, and generate animations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add Model Form */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Model
          </h2>
          <form onSubmit={handleAddModel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Type
              </label>
              <select
                value={newModel.api_type}
                onChange={(e) => setNewModel({ ...newModel, api_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Endpoint
              </label>
              <input
                type="text"
                value={newModel.api_endpoint}
                onChange={(e) => setNewModel({ ...newModel, api_endpoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Prompt
          </h2>
          <form onSubmit={handleAddPrompt} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Text
              </label>
              <textarea
                value={newPrompt.text}
                onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Describe the animation you want to generate..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Animation Generation Console
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
                         <select
               value={selectedModel}
               onChange={(e) => setSelectedModel(e.target.value ? parseInt(e.target.value) : '')}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
             >
               <option value="">Choose a model</option>
               {Array.isArray(models) && models.map((model) => (
                 <option key={model.id} value={model.id}>
                   {model.name} ({model.api_type})
                 </option>
               ))}
             </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Prompt
            </label>
                         <select
               value={selectedPrompt}
               onChange={(e) => setSelectedPrompt(e.target.value ? parseInt(e.target.value) : '')}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
             >
               <option value="">Choose a prompt</option>
               {Array.isArray(prompts) && prompts.map((prompt) => (
                 <option key={prompt.id} value={prompt.id}>
                   {prompt.text.substring(0, 50)}...
                 </option>
               ))}
             </select>
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <button
            onClick={generateAnimation}
            disabled={isGenerating || !selectedModel || !selectedPrompt}
            className="btn-primary flex items-center px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Animation'}
          </button>
        </div>
        
        {generatedCode && (
          <div data-generated-code>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Generated Code</h3>
              <button
                onClick={() => {
                  // Create a temporary animation object for viewing
                  const tempAnimation: Animation = {
                    id: 0,
                    code: generatedCode,
                    created_at: new Date().toISOString(),
                    prompt_text: 'Generated Code',
                    prompt_tags: ['generated'],
                    model_name: 'Current Model'
                  }
                  viewAnimation(tempAnimation)
                }}
                className="btn-primary text-sm px-4 py-2"
              >
                View Animation
              </button>
            </div>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{generatedCode}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Models List */}
      <div className="card mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Models</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ELO Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
               {Array.isArray(models) && models.map((model) => (
                 <tr key={model.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleModelClick(model)}>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                     {model.name}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {model.api_type}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {model.api_endpoint || '-'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {model.enabled ? model.elo_score || 1000 : 'Disabled'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                       model.enabled 
                         ? 'bg-green-100 text-green-800' 
                         : 'bg-red-100 text-red-800'
                     }`}>
                       {model.enabled ? 'Active' : 'Disabled'}
                     </span>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* Animations for Selected Model */}
      {selectedModelForAnimations && (
        <div className="card mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Animations for {selectedModelForAnimations.name}
          </h2>
          
          {isLoadingAnimations ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading animations...</p>
            </div>
          ) : selectedModelAnimations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No animations found for this model.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedModelAnimations.map((animation) => (
                <div 
                  key={animation.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    loadedAnimationId === animation.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => loadAnimation(animation)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      Animation #{animation.id}
                      {loadedAnimationId === animation.id && (
                        <span className="ml-2 text-xs text-green-600">✓ Loaded</span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(animation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {animation.prompt_text.substring(0, 100)}...
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {animation.prompt_tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadAnimation(animation)
                      }}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Load Code
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        viewAnimation(animation)
                      }}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      View Animation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Animation Viewer Modal */}
      {viewingAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Animation #{viewingAnimation.id} - {viewingAnimation.model_name}
              </h3>
              <button
                onClick={closeAnimationView}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Prompt:</strong> {viewingAnimation.prompt_text}
                </p>
                <div className="flex flex-wrap gap-1">
                  {viewingAnimation.prompt_tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="aspect-video bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
                      </head>
                      <body style="margin:0;padding:0;">
                        <script>
                          ${viewingAnimation.code}
                        </script>
                      </body>
                    </html>
                  `}
                  className="w-full h-full"
                  title={`Animation ${viewingAnimation.id}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 