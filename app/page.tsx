import Link from 'next/link'
import { ArrowRight, Trophy, Vote, TrendingUp } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800">
              GGBench
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A platform for comparing AI-generated graphics through community voting and ELO-based rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/voting"
              className="btn-primary flex items-center justify-center space-x-2 text-lg px-8 py-4"
            >
              <Vote className="w-5 h-5" />
              <span>Start Voting</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/leaderboard"
              className="btn-secondary flex items-center justify-center space-x-2 text-lg px-8 py-4"
            >
              <Trophy className="w-5 h-5" />
              <span>View Leaderboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Vote className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Voting</h3>
            <p className="text-gray-600">
              Compare AI-generated graphics side by side and vote for your favorite. Help determine which models produce the best results.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ELO Rankings</h3>
            <p className="text-gray-600">
              See how different AI models perform with our ELO-based ranking system. Track win rates and overall performance.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">
              Get detailed insights into model performance with comprehensive analytics and trend analysis.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to start evaluating?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join our community and help shape the future of AI-generated graphics.
            </p>
            <Link
              href="/voting"
              className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 