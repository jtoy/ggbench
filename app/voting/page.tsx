'use client'

import { useState, useEffect } from 'react'
import { Check, X, ArrowLeft, ArrowRight } from 'lucide-react'

interface Animation {
  id: number
  code: string
  model: {
    id: number
    name: string
  }
}

interface Comparison {
  id: number
  prompt: string
  animationA: Animation
  animationB: Animation
}

export default function VotingPage() {
  const [selectedVote, setSelectedVote] = useState<'A' | 'B' | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [currentComparison, setCurrentComparison] = useState<Comparison | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNextComparison()
  }, [])

  const fetchNextComparison = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/voting/next')
      if (response.ok) {
        const data = await response.json()
        setCurrentComparison(data)
      } else {
        setError('No more comparisons available')
      }
    } catch (error) {
      setError('Failed to load comparison')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async (vote: 'A' | 'B') => {
    if (!currentComparison) return
    
    setSelectedVote(vote)
    setHasVoted(true)
    
    try {
      const response = await fetch('/api/voting/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animationAId: currentComparison.animationA.id,
          animationBId: currentComparison.animationB.id,
          winner: vote
        })
      })
      
      if (!response.ok) {
        console.error('Failed to submit vote')
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
    }
  }

  const handleNext = () => {
    setSelectedVote(null)
    setHasVoted(false)
    fetchNextComparison()
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading comparison...</p>
        </div>
      </div>
    )
  }

  if (error || !currentComparison) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {error || 'No comparisons available'}
          </h1>
          <p className="text-gray-600 mb-8">
            Check back later for new comparisons or ask an admin to generate some animations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Which AI generated graphic is better?
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-lg text-blue-900 font-medium">
            "{currentComparison.prompt}"
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Animation A */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">Option A</div>
          </div>
          <div className="relative">
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
                        ${currentComparison.animationA.code}
                      </script>
                    </body>
                  </html>
                `}
                className="w-full h-full"
                title="Animation A"
              />
            </div>
            {selectedVote === 'A' && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Animation B */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-gray-500">Option B</div>
          </div>
          <div className="relative">
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
                        ${currentComparison.animationB.code}
                      </script>
                    </body>
                  </html>
                `}
                className="w-full h-full"
                title="Animation B"
              />
            </div>
            {selectedVote === 'B' && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voting Buttons */}
      <div className="flex justify-center space-x-4 mb-8">
        <button
          onClick={() => handleVote('A')}
          disabled={hasVoted}
          className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
            selectedVote === 'A'
              ? 'bg-green-500 text-white'
              : hasVoted
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <span>Vote A</span>
          {selectedVote === 'A' && <Check className="w-5 h-5" />}
        </button>

        <button
          onClick={() => handleVote('B')}
          disabled={hasVoted}
          className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
            selectedVote === 'B'
              ? 'bg-green-500 text-white'
              : hasVoted
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <span>Vote B</span>
          {selectedVote === 'B' && <Check className="w-5 h-5" />}
        </button>
      </div>

      {/* Next Button */}
      {hasVoted && (
        <div className="text-center">
          <button
            onClick={handleNext}
            className="btn-primary px-8 py-3 text-lg"
          >
            Next Comparison
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <span>Progress: 3 of 10</span>
          <div className="w-32 h-2 bg-gray-200 rounded-full">
            <div className="w-1/3 h-full bg-primary-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
} 