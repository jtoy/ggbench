'use client'

import { useState } from 'react'
import { ChevronDown, Trophy, TrendingUp, TrendingDown } from 'lucide-react'

export default function LeaderboardPage() {
  const [selectedType, setSelectedType] = useState('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Mock data - in a real app this would come from an API
  const leaderboardData = [
    {
      rank: 1,
      model: 'Claude 3.7 Sonnet',
      eloScore: 1016,
      winRate: 1.0,
      votes: 1,
      trend: 'up'
    },
    {
      rank: 2,
      model: 'Claude 3.5 Sonnet',
      eloScore: 1000,
      winRate: 0.0,
      votes: 0,
      trend: 'down'
    },
    {
      rank: 3,
      model: 'GPT-4 Vision',
      eloScore: 985,
      winRate: 0.8,
      votes: 15,
      trend: 'up'
    },
    {
      rank: 4,
      model: 'DALL-E 3',
      eloScore: 972,
      winRate: 0.7,
      votes: 23,
      trend: 'down'
    },
    {
      rank: 5,
      model: 'Midjourney v6',
      eloScore: 945,
      winRate: 0.6,
      votes: 31,
      trend: 'up'
    }
  ]

  const animationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'cityscape', label: 'Cityscape' },
    { value: 'nature', label: 'Nature' },
    { value: 'abstract', label: 'Abstract' },
    { value: 'character', label: 'Character' },
    { value: 'scifi', label: 'Sci-Fi' }
  ]

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">3</span>
        </div>
      )
    }
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
        <span className="text-gray-600 font-bold">{rank}</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Leaderboard</h1>
        <p className="text-gray-600">
          See how different AI models perform in generating graphics across various categories.
        </p>
      </div>

      {/* Filter Section */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Animation Type:</label>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <span>
                {animationTypes.find(type => type.value === selectedType)?.label}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {animationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedType(type.value)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      selectedType === type.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ELO Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Votes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboardData.map((item) => (
                <tr key={item.rank} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRankBadge(item.rank)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {item.eloScore}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.winRate}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.votes}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTrendIcon(item.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">5</div>
          <div className="text-sm text-gray-600">Active Models</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">70</div>
          <div className="text-sm text-gray-600">Total Votes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">6</div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
      </div>
    </div>
  )
} 