'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

export default function VotingPage() {
  const [selectedVote, setSelectedVote] = useState<'A' | 'B' | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  // Mock data - in a real app this would come from an API
  const currentComparison = {
    id: 1,
    prompt: "Create a futuristic cityscape with flying cars and neon lights",
    modelA: "Claude 3.5 Sonnet",
    modelB: "Claude 3.7 Sonnet",
    animationA: "/api/animations/1/a", // Placeholder URLs
    animationB: "/api/animations/1/b",
  }

  const handleVote = (vote: 'A' | 'B') => {
    setSelectedVote(vote)
    setHasVoted(true)
    // In a real app, this would submit the vote to the backend
    console.log(`Voted for ${vote}`)
  }

  const handleNext = () => {
    setSelectedVote(null)
    setHasVoted(false)
    // In a real app, this would load the next comparison
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentComparison.modelA}
            </h3>
            <div className="text-sm text-gray-500">Option A</div>
          </div>
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-500">Animation Preview</p>
                <p className="text-sm text-gray-400">Click to play</p>
              </div>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentComparison.modelB}
            </h3>
            <div className="text-sm text-gray-500">Option B</div>
          </div>
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-primary-600 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-500">Animation Preview</p>
                <p className="text-sm text-gray-400">Click to play</p>
              </div>
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