// src/components/StatsGrid.tsx
import React from 'react';
import { TrendingUp, DollarSign, Activity, Calendar } from 'lucide-react';

type Stats = {
  totalTrades: number;
  openTrades: number;
  totalPnL: number;
  winRate: number;
};

type Props = {
  stats: Stats;
};

export function StatsGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard icon={<Activity className="h-8 w-8 text-blue-400" />} title="Total Trades" value={stats.totalTrades} />
      <StatCard icon={<Calendar className="h-8 w-8 text-orange-400" />} title="Open Positions" value={stats.openTrades} />
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

// کامپوننت کوچک برای هر کارت
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