import React from 'react';
import { Activity, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { Trade } from '../lib/supabase';

interface DashboardStatsProps {
  trades: Trade[];
  calculateLivePnL: (trade: Trade) => number;
}

export function DashboardStats({ trades, calculateLivePnL }: DashboardStatsProps) {
  const stats = {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    totalPnL: trades.reduce((sum, trade) => sum + calculateLivePnL(trade), 0),
    winRate: trades.filter(t => t.status === 'closed').length > 0
      ? (trades.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length / trades.filter(t => t.status === 'closed').length) * 100
      : 0
  };

  return (
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
  );
}
