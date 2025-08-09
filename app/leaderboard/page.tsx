'use client'

import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/leaderboard`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboardData(data)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4 dark:text-gray-100">Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          See how different AI models perform in generating graphics across various categories.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden dark:bg-gray-900">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading leaderboard...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    ELO Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
                {leaderboardData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRankBadge(index + 1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold dark:text-gray-100">
                        {item.elo_score}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.win_rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.total_votes}
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
        )}
      </div>

    </div>
  )
} 