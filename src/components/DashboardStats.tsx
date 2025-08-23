import React from 'react';
import { Activity, Calendar, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
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
      : 0,
    // (CHANGE 1) - محاسبه آمار جدید
    realizedPnl: trades
      .filter(t => t.status === 'closed')
      .reduce((sum, t) => sum + (t.pnl || 0), 0),
  };

  return (
    // (CHANGE 2) - به‌روزرسانی گرید برای نمایش ۵ ستون در صفحات بزرگ
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
      <StatCard icon={<Activity className="h-8 w-8 text-blue-400" />} title="Total/Open Trades" value={stats.totalTrades+" / "+stats.openTrades} />
      {/* <StatCard icon={<Calendar className="h-8 w-8 text-orange-400" />} title="Open Positions" value={stats.openTrades} /> */}
      
      {/* (CHANGE 3) - کارت جدید برای Realized PNL */}
      <StatCard 
        icon={<CheckCircle className="h-8 w-8 text-indigo-400" />}
        title="Realized PNL"
        value={`$${stats.realizedPnl.toFixed(2)}`}
        valueClassName={stats.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
      />
      
      <StatCard 
        icon={<DollarSign className="h-8 w-8 text-emerald-400" />} 
        title="Total P&L" 
        value={`$${stats.totalPnL.toFixed(2)}`}
        valueClassName={stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
      />
      <StatCard icon={<TrendingUp className="h-8 w-8 text-purple-400" />} title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
    </div>
  );
}

const StatCard = ({ icon, title, value, valueClassName = 'text-white' }: { icon: React.ReactNode, title: string, value: string | number, valueClassName?: string }) => (
    <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
            </div>
            {icon}
        </div>
    </div>
);