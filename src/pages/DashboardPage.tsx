import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { TradeForm } from '../components/TradeForm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Trade } from '../lib/supabase'
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all')

  const fetchTrades = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date_time', { ascending: false })

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

  const filteredTrades = trades.filter(trade => 
    filterStatus === 'all' || trade.status === filterStatus
  )

  const stats = {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    totalPnL: trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
    winRate: trades.filter(t => t.status === 'closed').length > 0 
      ? (trades.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length / trades.filter(t => t.status === 'closed').length) * 100 
      : 0
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Trading Dashboard</h1>
            <p className="text-gray-300">Track and analyze your trading performance</p>
          </div>
          <button
            onClick={() => setShowTradeForm(true)}
            className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Trade</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Open Positions</p>
                <p className="text-2xl font-bold text-white">{stats.openTrades}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl font-semibold text-white mb-4 sm:mb-0">Recent Trades</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
                  className="bg-gray-700/50 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Trades</option>
                  <option value="open">Open Positions</option>
                  <option value="closed">Closed Trades</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTrades.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  {trades.length === 0 ? "No trades yet" : "No trades match the current filter"}
                </div>
                {trades.length === 0 && (
                  <button
                    onClick={() => setShowTradeForm(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Add Your First Trade
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Pair</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Direction</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Size</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Entry</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Exit</th>
                    <th className="text-left p-4 text-gray-300 font-medium">P&L</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="p-4 text-gray-300">
                        {new Date(trade.date_time).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-white font-medium">{trade.crypto_pair}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1">
                          {trade.direction === 'long' ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          )}
                          <span className={trade.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                            {trade.direction.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">${trade.position_size.toFixed(2)}</td>
                      <td className="p-4 text-gray-300">${trade.entry_price.toFixed(4)}</td>
                      <td className="p-4 text-gray-300">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(4)}` : '-'}
                      </td>
                      <td className="p-4">
                        {trade.pnl !== null ? (
                          <span className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            ${trade.pnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trade.status === 'open' 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showTradeForm && (
        <TradeForm
          onTradeAdded={fetchTrades}
          onClose={() => setShowTradeForm(false)}
        />
      )}
    </Layout>
  )
}