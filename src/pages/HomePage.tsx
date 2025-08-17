import React from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { TrendingUp, Shield, BarChart3, Smartphone } from 'lucide-react'

export function HomePage() {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Track Your Crypto Trading
              <span className="text-emerald-400 block">Journey</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              A secure, private, and powerful trading journal to help you analyze your performance, 
              improve your strategy, and become a better trader.
            </p>
            <div className="space-x-4">
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Start Trading Journal
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center px-8 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold rounded-lg border border-gray-600 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Choose CryptoJournal?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Everything you need to track, analyze, and improve your trading performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-gray-600/30 hover:border-emerald-500/30 transition-all duration-200">
              <div className="bg-emerald-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Smart Tracking</h3>
              <p className="text-gray-300">
                Automatically calculate P&L and track all your trading metrics with precision
              </p>
            </div>

            <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-gray-600/30 hover:border-emerald-500/30 transition-all duration-200">
              <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
              <p className="text-gray-300">
                Visualize your performance with charts, graphs, and detailed statistics
              </p>
            </div>

            <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-gray-600/30 hover:border-emerald-500/30 transition-all duration-200">
              <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Bank-Level Security</h3>
              <p className="text-gray-300">
                Your trading data is encrypted and completely private to your account
              </p>
            </div>

            <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-gray-600/30 hover:border-emerald-500/30 transition-all duration-200">
              <div className="bg-orange-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Mobile Ready</h3>
              <p className="text-gray-300">
                Access your trading journal anywhere with our responsive mobile design
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Improve Your Trading?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of traders who are already using CryptoJournal to track their progress and improve their results.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </Layout>
  )
}