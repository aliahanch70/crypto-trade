import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, X, Calculator } from 'lucide-react'

type TradeFormProps = {
  onTradeAdded: () => void
  onClose: () => void
}

export function TradeForm({ onTradeAdded, onClose }: TradeFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    date_time: new Date().toISOString().slice(0, 16),
    crypto_pair: '',
    direction: 'long' as 'long' | 'short',
    position_size: '',
    entry_price: '',
    exit_price: '',
    stop_loss: '',
    take_profit: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const calculatePnL = () => {
    const { direction, position_size, entry_price, exit_price } = formData
    
    if (!position_size || !entry_price || !exit_price) return 0
    
    const size = parseFloat(position_size)
    const entry = parseFloat(entry_price)
    const exit = parseFloat(exit_price)
    
    if (direction === 'long') {
      return ((exit - entry) / entry) * size * entry
    } else {
      return ((entry - exit) / entry) * size * entry
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const pnl = formData.exit_price ? calculatePnL() : null
    const status = formData.exit_price ? 'closed' : 'open'

    try {
      const { error } = await supabase.from('trades').insert({
        user_id: user.id,
        date_time: formData.date_time,
        crypto_pair: formData.crypto_pair.toUpperCase(),
        direction: formData.direction.charAt(0).toUpperCase() + formData.direction.slice(1),
        position_size: parseFloat(formData.position_size),
        entry_price: parseFloat(formData.entry_price),
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        pnl,
        notes: formData.notes,
        status
      })

      if (error) throw error

      onTradeAdded()
      onClose()
    } catch (error) {
      console.error('Error adding trade:', error)
    }

    setLoading(false)
  }

  const calculatedPnL = calculatePnL()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Plus className="h-6 w-6 mr-2 text-emerald-400" />
              Add New Trade
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date_time}
                  onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Crypto Pair
                </label>
                <input
                  type="text"
                  required
                  placeholder="BTC/USDT"
                  value={formData.crypto_pair}
                  onChange={(e) => setFormData({ ...formData, crypto_pair: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Direction
                </label>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'long' | 'short' })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Size ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="1000.00"
                  value={formData.position_size}
                  onChange={(e) => setFormData({ ...formData, position_size: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  required
                  placeholder="65000.00"
                  value={formData.entry_price}
                  onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exit Price (Optional)
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="67000.00"
                  value={formData.exit_price}
                  onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stop Loss (Optional)
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="63000.00"
                  value={formData.stop_loss}
                  onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Take Profit (Optional)
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="70000.00"
                  value={formData.take_profit}
                  onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            {formData.exit_price && (
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium text-gray-300">Calculated P&L</span>
                </div>
                <div className={`text-2xl font-bold ${calculatedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${calculatedPnL.toFixed(2)}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Trading strategy, psychology, market conditions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600/50 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding Trade...' : 'Add Trade'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}