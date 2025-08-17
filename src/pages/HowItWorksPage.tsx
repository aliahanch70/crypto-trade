import React from 'react'
import { Layout } from '../components/Layout'
import { Link } from 'react-router-dom'
import { 
  UserPlus, 
  Plus, 
  BarChart3, 
  TrendingUp,
  Shield,
  Smartphone,
  ArrowRight
} from 'lucide-react'

export function HowItWorksPage() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create Your Account',
      description: 'Sign up with your email and create a secure account. Your data is encrypted and completely private.',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    },
    {
      icon: Plus,
      title: 'Log Your Trades',
      description: 'Add trades with detailed information including entry/exit prices, position size, and notes about your strategy.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: BarChart3,
      title: 'Analyze Performance',
      description: 'View comprehensive analytics including P&L charts, win rates, and performance by crypto pair.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      icon: TrendingUp,
      title: 'Improve Your Strategy',
      description: 'Use insights from your trading data to refine your strategy and become a more disciplined trader.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    }
  ]

  const features = [
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your trading data is protected with enterprise-grade encryption and security measures.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Responsive',
      description: 'Access your trading journal from any device with our fully responsive design.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive charts and statistics to help you understand your trading patterns.'
    }
  ]

  return (
    <Layout>
      {/* Hero Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How CryptoJournal Works
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            A simple 4-step process to start tracking and improving your crypto trading performance
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="py-16 bg-gray-800/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                <div className="flex-shrink-0">
                  <div className={`${step.bgColor} w-16 h-16 rounded-full flex items-center justify-center`}>
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-3 mb-4">
                    <span className="text-sm font-medium text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
                      Step {index + 1}
                    </span>
                    <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block">
                    <ArrowRight className="h-6 w-6 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Traders Choose CryptoJournal
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Built specifically for crypto traders who want to improve their performance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-gray-600/30 text-center">
                <div className="bg-emerald-500/20 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="py-20 bg-gray-800/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              See It In Action
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto mb-8">
              Here's what your trading journal dashboard will look like with your data
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-8 border border-gray-700/50">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-700/50 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-white">47</div>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Win Rate</div>
                <div className="text-2xl font-bold text-emerald-400">68.1%</div>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Total P&L</div>
                <div className="text-2xl font-bold text-emerald-400">+$2,847.50</div>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-4">
                <div className="text-gray-400 text-sm mb-1">Open Positions</div>
                <div className="text-2xl font-bold text-white">3</div>
              </div>
            </div>
            
            <div className="text-center text-gray-400">
              <p>Interactive charts, detailed trade history, and performance analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Start Your Trading Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of traders who are already improving their performance with CryptoJournal.
          </p>
          <div className="space-x-4">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Start Free Today
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold rounded-lg border border-gray-600 transition-all duration-200"
            >
              Have Questions?
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}