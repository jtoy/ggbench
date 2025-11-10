'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { RotateCw } from 'lucide-react'

interface AnimationItem {
  id: number
  model_id: number
  prompt_id: number
  code: string
  framework: string
  created_at: string
  prompt_text: string
  prompt_tags: string[]
  model_name: string
  total_votes: number
  wins: number
  losses: number
  ties: number
}

export default function ModelGalleryPage() {
  const params = useParams()
  const modelId = params?.modelId as string
  const [items, setItems] = useState<AnimationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [showCodeById, setShowCodeById] = useState<Record<number, boolean>>({})
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all')

  useEffect(() => {
    const run = async () => {
      if (!modelId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/animations?modelId=${modelId}`, { credentials: 'include' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'Failed to fetch')
        }
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [modelId])

  const modelName = useMemo(() => items?.[0]?.model_name || 'Model', [items])

  const filteredItems = useMemo(() => {
    if (frameworkFilter === 'all') return items
    return items.filter(item => (item.framework || 'p5js') === frameworkFilter)
  }, [items, frameworkFilter])

  const frameworkCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length }
    items.forEach(item => {
      const framework = item.framework || 'p5js'
      counts[framework] = (counts[framework] || 0) + 1
    })
    return counts
  }, [items])

  const handleRegenerate = async (item: AnimationItem) => {
    if (!modelId) return
    const confirm = window.confirm(`Regenerate this ${item.framework || 'p5js'} animation code for the same prompt? This will overwrite the existing code.`)
    if (!confirm) return

    setRegeneratingId(item.id)
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          modelId: Number(modelId), 
          promptId: item.prompt_id,
          framework: item.framework || 'p5js'
        })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to regenerate')
      }
      // Refresh list after success
      const refreshed = await fetch(`/api/admin/animations?modelId=${modelId}`, { credentials: 'include' })
      if (refreshed.ok) {
        const data = await refreshed.json()
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setRegeneratingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading gallery…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{modelName} – Gallery</h1>
          <p className="text-gray-600">All animations for this model with prompt and votes</p>
        </div>
        <Link href="/admin" className="text-primary-600 hover:underline">Back to Admin</Link>
      </div>

      {items.length > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Framework:
          </label>
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All ({frameworkCounts.all})</option>
            <option value="p5js">p5.js ({frameworkCounts.p5js || 0})</option>
            <option value="threejs">Three.js ({frameworkCounts.threejs || 0})</option>
            <option value="svg">SVG ({frameworkCounts.svg || 0})</option>
          </select>
          {frameworkFilter !== 'all' && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredItems.length} of {items.length} animations
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-600">No animations yet for this model.</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-gray-600">No animations found for the selected framework.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative border rounded-lg p-4 bg-white shadow-sm">
              <button
                onClick={() => handleRegenerate(item)}
                className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50"
                disabled={regeneratingId === item.id}
                title="Regenerate"
              >
                <RotateCw className="w-3 h-3" />
                {regeneratingId === item.id ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button
                onClick={() => setShowCodeById((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="absolute top-2 left-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50"
                title={showCodeById[item.id] ? 'Show Animation' : 'Show Code'}
              >
                {showCodeById[item.id] ? 'Show Animation' : 'Show Code'}
              </button>

              <div className="mb-2">
                <div className="text-sm font-medium text-gray-900">Prompt</div>
                <div className="text-sm text-gray-700 line-clamp-4">{item.prompt_text}</div>
                {Array.isArray(item.prompt_tags) && item.prompt_tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.prompt_tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {item.framework || 'p5js'}
                </span>
                <span>Votes: {item.total_votes}</span>
                <span>W {item.wins}</span>
                <span>L {item.losses}</span>
                <span>T {item.ties}</span>
              </div>

              {showCodeById[item.id] ? (
                <div className="bg-gray-900 rounded-md overflow-hidden">
                  <pre className="text-[10px] leading-snug text-green-400 p-3 overflow-auto max-h-64">{item.code}</pre>
                </div>
              ) : (
                <AnimationPreview code={item.code} framework={item.framework || 'p5js'} width={400} height={400} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnimationPreview({ code, framework = 'p5js', width = 400, height = 400 }: { code: string; framework?: string; width?: number; height?: number }) {
  const getHTML = () => {
    if (framework === 'p5js') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #ffffff; }
    body, #container { width: 100vw; height: 100vh; }
    #container { position: relative; overflow: hidden; background: #ffffff; }
    canvas { display: block; width: 100vw !important; height: 100vh !important; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
</head>
<body>
<div id="container"></div>
<script>
try { 
${code}
} catch (e) {
  document.body.innerHTML = '<pre style="color:red;font:12px/1.4 monospace; padding:8px;">' + (e && e.message ? e.message : 'Error') + '</pre>'
}
function attachCanvasOnceReady() {
  var container = document.getElementById('container')
  if (!container) return
  var canvas = document.querySelector('canvas')
  if (!canvas) {
    requestAnimationFrame(attachCanvasOnceReady)
    return
  }
  if (canvas.parentElement !== container) {
    container.appendChild(canvas)
  }
}
attachCanvasOnceReady()
</script>
</body>
</html>`
    } else if (framework === 'threejs') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #000000; }
    body { width: 100vw; height: 100vh; }
    canvas { display: block; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
<script>
try {
${code}
} catch (e) {
  document.body.innerHTML = '<pre style="color:red;font:12px/1.4 monospace; padding:8px; background:#fff;">' + (e && e.message ? e.message : 'Error') + '</pre>'
}
</script>
</body>
</html>`
    } else if (framework === 'svg') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: #ffffff; }
    body { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
    svg { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
${code}
</body>
</html>`
    }
    return ''
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
      <iframe
        title={`${framework}-preview`}
        srcDoc={getHTML()}
        width={width}
        height={height}
        className="block"
        sandbox="allow-scripts"
      />
    </div>
  )
}


