import { Users, Target, Award, BarChart3 } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About GGBench</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A platform for comparing AI-generated graphics through community voting and ELO-based rankings.
        </p>
      </div>

      {/* Mission Section */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
        <p className="text-gray-600 mb-4">
          GGBench aims to provide a comprehensive evaluation platform for AI-generated graphics. 
          We believe that community-driven assessment combined with sophisticated ranking algorithms 
          can help identify the most effective AI models for different types of graphic generation tasks.
        </p>
        <p className="text-gray-600">
          By creating a transparent and fair evaluation system, we hope to accelerate the development 
          of better AI graphics generation tools and provide valuable insights to both developers and users.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Voting</h3>
            <p className="text-gray-600 text-sm">
              Users compare AI-generated graphics side by side and vote for their preferred option. 
              Each vote contributes to the overall ranking of the models.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">ELO Ranking System</h3>
            <p className="text-gray-600 text-sm">
              We use an ELO-based ranking system similar to chess ratings to determine model performance. 
              Wins and losses affect scores based on the relative strength of opponents.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600 text-sm">
              Detailed analytics show win rates, vote counts, and performance trends across different 
              categories and animation types.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Award className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Fair Evaluation</h3>
              <p className="text-gray-600 text-sm">
                Our ELO system ensures fair comparisons by accounting for the relative strength of competing models.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Award className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Category Filtering</h3>
              <p className="text-gray-600 text-sm">
                Filter results by animation type to see how models perform in specific categories like cityscape, nature, or abstract.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Award className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
              <p className="text-gray-600 text-sm">
                Leaderboard and rankings update in real-time as new votes are cast by the community.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Award className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Transparent Process</h3>
              <p className="text-gray-600 text-sm">
                All voting data and ranking calculations are transparent and publicly available for verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Technology</h2>
        <p className="text-gray-600 mb-4">
          GGBench is built using modern web technologies including Next.js, React, and Tailwind CSS. 
          The platform is designed to be fast, responsive, and accessible across all devices.
        </p>
        <p className="text-gray-600">
          Our ELO ranking system is based on the widely-used chess rating system, adapted for 
          AI model comparison. This ensures fair and mathematically sound evaluations.
        </p>
      </div>

      {/* Contact */}
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Involved</h2>
        <p className="text-gray-600 mb-6">
          Join our community and help shape the future of AI graphics evaluation. 
          Your votes contribute to better understanding of AI model performance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-primary">
            Start Voting
          </button>
          <button className="btn-secondary">
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
} 