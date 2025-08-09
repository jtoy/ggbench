'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, X, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

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
  const [showModelNames, setShowModelNames] = useState(false)
  const [refreshKeyA, setRefreshKeyA] = useState(0)
  const [refreshKeyB, setRefreshKeyB] = useState(0)

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

    // Show model names for 1 second after voting
    setShowModelNames(true)
    setTimeout(() => {
      setShowModelNames(false)
      handleNext()
    }, 1000)
  }

  const handleNext = () => {
    setSelectedVote(null)
    setHasVoted(false)
    setRefreshKeyA(prev => prev + 1)
    setRefreshKeyB(prev => prev + 1)
    fetchNextComparison()
  }

  const refreshAnimationA = () => {
    setRefreshKeyA(prev => prev + 1)
  }

  const refreshAnimationB = () => {
    setRefreshKeyB(prev => prev + 1)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading comparison...</p>
        </div>
      </div>
    )
  }

  if (error || !currentComparison) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 dark:text-gray-100">
            {error || 'No comparisons available'}
          </h1>
          <p className="text-gray-600 mb-8 dark:text-gray-300">
            Check back later for new comparisons or ask an admin to generate some animations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
<<<<<<< HEAD
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Which AI generated graphic animation is better?
=======
        <h1 className="text-3xl font-bold text-gray-900 mb-4 dark:text-gray-100">
          Which AI generated graphic is better?
>>>>>>> 76077efd683e3d61ac34d2c119bd14cec1385bc5
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto dark:bg-gray-800 dark:border-gray-700">
          <p className="text-lg text-blue-900 font-medium dark:text-gray-100">
            "{currentComparison.prompt}"
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
        {/* Animation A */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Option A</div>
            {showModelNames && (
              <div className="text-lg font-semibold text-blue-600 mt-2">
                Model: {currentComparison.animationA.model.name}
              </div>
            )}
          </div>
          <div className="relative">
            <div className="relative w-full max-w-[600px] aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden mx-auto dark:bg-gray-900 dark:border-gray-800">
              <iframe
                key={`animationA-${refreshKeyA}`}
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
                    </head>
                    <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;width:100vw;height:100vh;">
                      <script>
                        ${currentComparison.animationA.code}
                      </script>
                    </body>
                  </html>
                `}
                className="absolute inset-0 w-full h-full"
                title="Animation A"
              />
            </div>
            <button
              onClick={refreshAnimationA}
              className="absolute top-2 left-2 w-8 h-8 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-md transition-all dark:bg-gray-800 dark:text-gray-200"
              title="Refresh Animation A"
            >
              <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            {selectedVote === 'A' && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Voting Buttons (between A and B) */}
        <div className="block lg:hidden">
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={() => handleVote('A')}
              disabled={hasVoted}
              className={`flex items-center justify-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
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
              className={`flex items-center justify-center space-x-2 px-8 py-3 rounded-lg font-medium transition-colors ${
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
        </div>

        {/* Animation B */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Option B</div>
            {showModelNames && (
              <div className="text-lg font-semibold text-blue-600 mt-2">
                Model: {currentComparison.animationB.model.name}
              </div>
            )}
          </div>
          <div className="relative">
            <div className="relative w-full max-w-[600px] aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden mx-auto dark:bg-gray-900 dark:border-gray-800">
              <iframe
                key={`animationB-${refreshKeyB}`}
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
                    </head>
                    <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;width:100vw;height:100vh;">
                      <script>
                        ${currentComparison.animationB.code}
                      </script>
                    </body>
                  </html>
                `}
                className="absolute inset-0 w-full h-full"
                title="Animation B"
              />
            </div>
            <button
              onClick={refreshAnimationB}
              className="absolute top-2 left-2 w-8 h-8 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-md transition-all dark:bg-gray-800 dark:text-gray-200"
              title="Refresh Animation B"
            >
              <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            {selectedVote === 'B' && (
              <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Voting Buttons (bottom) */}
      <div className="hidden lg:flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-8">
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

      {/* Auto-advance message */}
      {hasVoted && showModelNames && (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Loading next comparison in 1 second...
          </p>
        </div>
      )}


    </div>
  )
} 