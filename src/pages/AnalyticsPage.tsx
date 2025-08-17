import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Trade } from '../lib/supabase'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar } from 'lucide-react'

export function AnalyticsPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrades = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date_time', { ascending: true })

      if (error) throw error
      setTrades(data || [])
    } catch (error) {
      console.error('Error fetching trades:', error)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchTrades()
  }, [user])

  // Prepare data for charts
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null)
  
  // P&L over time
  let runningPnL = 0
  const pnlOverTime = closedTrades.map(trade => {
    runningPnL += trade.pnl || 0
    return {
      date: new Date(trade.date_time).toLocaleDateString(),
      pnl: runningPnL,
      tradePnL: trade.pnl || 0
    }
  })

  // Win/Loss ratio
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0).length
  const winLossData = [
    { name: 'Wins', value: wins, color: '#10B981' },
    { name: 'Losses', value: losses, color: '#EF4444' }
  ]

  // Performance by crypto pair
  const pairPerformance = Object.entries(
    trades.reduce((acc, trade) => {
      if (!acc[trade.crypto_pair]) {
        acc[trade.crypto_pair] = { pnl: 0, trades: 0 }
      }
      acc[trade.crypto_pair].pnl += trade.pnl || 0
      acc[trade.crypto_pair].trades += 1
      return acc
    }, {} as Record<string, { pnl: number; trades: number }>)
  ).map(([pair, data]) => ({
    pair,
    pnl: data.pnl,
    trades: data.trades
  })).sort((a, b) => b.pnl - a.pnl)

  // Monthly performance
  const monthlyPerformance = Object.entries(
    closedTrades.reduce((acc, trade) => {
      const month = new Date(trade.date_time).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      if (!acc[month]) acc[month] = 0
      acc[month] += trade.pnl || 0
      return acc
    }, {} as Record<string, number>)
  ).map(([month, pnl]) => ({ month, pnl }))

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (closedTrades.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Analytics</h1>
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-8 border border-gray-700/50 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
            <p className="text-gray-300 mb-4">
              Complete some trades to see your analytics and performance insights.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-300">Visualize your trading performance and patterns</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* P&L Over Time */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
              <h3 className="text-xl font-semibold text-white">P&L Over Time</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    formatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      name === 'pnl' ? 'Cumulative P&L' : 'Trade P&L'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win/Loss Ratio */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-2 mb-4">
              <PieChartIcon className="h-6 w-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Win/Loss Ratio</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-300">Wins ({wins})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Losses ({losses})</span>
              </div>
            </div>
          </div>

          {/* Performance by Crypto Pair */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-6 w-6 text-purple-400" />
              <h3 className="text-xl font-semibold text-white">Performance by Pair</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pairPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    stroke="#9CA3AF"
                    fontSize={12}
                    formatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="pair" 
                    stroke="#9CA3AF"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      'P&L'
                    ]}
                  />
                  <Bar 
                    dataKey="pnl" 
                    fill="#8B5CF6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-6 w-6 text-orange-400" />
              <h3 className="text-xl font-semibold text-white">Monthly Performance</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    formatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      'Monthly P&L'
                    ]}
                  />
                  <Bar 
                    dataKey="pnl" 
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}