import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Trade } from '../lib/supabase';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { TrendingUp, TrendingDown, Target, Bot, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
);

// --- Helper Types & Functions ---

interface AnalysisData {
  totalPnl: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  pnlByEmotion: { [key: string]: number };
  mostCommonMistake: { name: string; count: number; pnl: number } | null;
}

// The AI Coach's Logic
const generateAiCoachAnalysis = (analysisData: AnalysisData, t: any) => {
  const insights = [];

  // Insight 1: Overall Performance
  if (analysisData.totalPnl > 0) {
    insights.push({ type: 'strength', text: t('positivePerformance', { pnl: analysisData.totalPnl.toFixed(2) }) });
  } else {
    insights.push({ type: 'weakness', text: t('negativePerformance', { pnl: Math.abs(analysisData.totalPnl).toFixed(2) }) });
  }

  // Insight 2: Profit Factor
  if (analysisData.profitFactor > 2) {
    insights.push({ type: 'strength', text: t('excellentProfitFactor', { factor: analysisData.profitFactor.toFixed(2) }) });
  } else if (analysisData.profitFactor < 1 && analysisData.profitFactor > 0) {
    insights.push({ type: 'weakness', text: t('poorProfitFactor', { factor: analysisData.profitFactor.toFixed(2) }) });
  }

  // Insight 3: Most common mistake and its cost
  if (analysisData.mostCommonMistake?.name) {
    const mistake = analysisData.mostCommonMistake;
    if (mistake.pnl < 0) {
      insights.push({ type: 'weakness', text: t('commonMistake', { mistake: mistake.name, cost: Math.abs(mistake.pnl).toFixed(2) }) });
    }
  }

  // Insight 4: Most impactful emotion
  const emotions = Object.entries(analysisData.pnlByEmotion);
  if (emotions.length > 0) {
    const mostProfitableEmotion = emotions.reduce((max, item) => (item[1] > max[1] ? item : max), ['', -Infinity]);
    const mostCostlyEmotion = emotions.reduce((min, item) => (item[1] < min[1] ? item : min), ['', Infinity]);

    if (mostProfitableEmotion[1] > 0) {
      insights.push({ type: 'strength', text: t('bestEmotion', { emotion: mostProfitableEmotion[0], profit: mostProfitableEmotion[1].toFixed(2) }) });
    }
    if (mostCostlyEmotion[1] < 0) {
      insights.push({ type: 'weakness', text: t('worstEmotion', { emotion: mostCostlyEmotion[0], loss: Math.abs(mostCostlyEmotion[1]).toFixed(2) }) });
    }
  }

  // Insight 5: Final Observation
  insights.push({ type: 'observation', text: t('finalObservation') });

  return insights;
};

// --- Main Component ---

export function AnalyticsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation('analysis');
  

  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'closed')
          .order('date_time', { ascending: true });

        if (error) throw error;
        setTrades(data || []);
      } catch (error) {
        console.error('Error fetching trades:', error);
      }
      setLoading(false);
    };

    fetchTrades();
  }, [user]);

  const analysis = useMemo(() => {
    if (trades.length < 3) return null;

    // --- Data Processing ---
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    const totalWinPnl = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLossPnl = losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const averageWin = winningTrades.length > 0 ? totalWinPnl / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLossPnl / losingTrades.length : 0;
    const profitFactor = averageWin > 0 && averageLoss < 0 ? Math.abs(averageWin / averageLoss) : 0;

    // Cumulative P&L Data
    let cumulativePnl = 0;
    const cumulativePnlData = trades.map(t => {
      cumulativePnl += t.pnl || 0;
      return cumulativePnl;
    });
    const cumulativePnlLabels = trades.map((_, index) => `${t('trade')} ${index + 1}`);

    // P&L by Pair Data
    const pnlByPair = trades.reduce((acc, trade) => {
      const pair = trade.crypto_pair;
      if (!acc[pair]) acc[pair] = 0;
      acc[pair] += trade.pnl || 0;
      return acc;
    }, {} as { [key: string]: number });
    
    const pnlByPairLabels = Object.keys(pnlByPair);
    const pnlByPairData = Object.values(pnlByPair);

    // AI Analysis Data
    const pnlByEmotion = trades.reduce((acc, trade) => {
        const emotion = trade.emotions?.trim();
        if (emotion) { if (!acc[emotion]) acc[emotion] = 0; acc[emotion] += trade.pnl || 0; }
        return acc;
    }, {} as { [key: string]: number });
    
    const mistakeCounts = trades.reduce((acc, trade) => {
        const mistake = trade.mistakes?.trim();
        if (mistake) { if (!acc[mistake]) acc[mistake] = { count: 0, pnl: 0 }; acc[mistake].count += 1; acc[mistake].pnl += trade.pnl || 0; }
        return acc;
    }, {} as { [key: string]: { count: number, pnl: number } });

    const mostCommonMistakeEntry = Object.entries(mistakeCounts).sort((a, b) => b[1].count - a[1].count)[0];
    const mostCommonMistake = mostCommonMistakeEntry ? { name: mostCommonMistakeEntry[0], ...mostCommonMistakeEntry[1] } : null;

    const analysisData: AnalysisData = { totalPnl, winRate, averageWin, averageLoss, profitFactor, pnlByEmotion, mostCommonMistake };
    
    return {
      stats: { totalPnl, winRate, averageWin, averageLoss, profitFactor },
      cumulativePnlChart: {
        labels: cumulativePnlLabels,
        datasets: [{ label: t('cumulativePnl'), data: cumulativePnlData, borderColor: totalPnl >= 0 ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)', backgroundColor: totalPnl >= 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', fill: true, tension: 0.2 }]
      },
      pnlByPairChart: {
        labels: pnlByPairLabels,
        datasets: [{ label: t('pnlByPair'), data: pnlByPairData, backgroundColor: pnlByPairData.map(pnl => pnl >= 0 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)'), borderWidth: 1 }]
      },
      aiInsights: generateAiCoachAnalysis(analysisData, t),
    };
  }, [trades, t]);

    if (loading) {
      return (
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-700 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-700 rounded-xl"></div>)}
              </div>
            </div>
          </div>
        </Layout>
      );
    }
  
  if (!analysis) {
    return <Layout><div className="text-white text-center p-10">{t('minTrades')}</div></Layout>;
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
        x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ltr">
        <h1 className="text-3xl font-bold text-white mb-8">{t('tradingAnalysis')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<TrendingUp />} title={t('winRate')} value={`${analysis.stats.winRate.toFixed(1)}%`} />
            <StatCard icon={<TrendingUp className="text-emerald-400" />} title={t('averageWin')} value={`$${analysis.stats.averageWin.toFixed(2)}`} />
            <StatCard icon={<TrendingDown className="text-red-400" />} title={t('averageLoss')} value={`$${Math.abs(analysis.stats.averageLoss).toFixed(2)}`} />
            <StatCard icon={<Target />} title={t('profitFactor')} value={analysis.stats.profitFactor.toFixed(2)} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 h-96">
            <h2 className="text-xl font-semibold text-white mb-4">{t('cumulativePnl')}</h2>
            <Line options={chartOptions} data={analysis.cumulativePnlChart} />
          </div>
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 h-96">
            <h2 className="text-xl font-semibold text-white mb-4">{t('pnlByPair')}</h2>
            <Bar options={{...chartOptions, indexAxis: 'y' as const}} data={analysis.pnlByPairChart} />
          </div>
        </div>

        <div className="bg-gray-900/50 p-6 rounded-xl border border-purple-500/30 ring-1 ring-purple-500/10 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Bot className="mr-3 h-7 w-7 text-purple-400" />
            {t('aiCoach')}
          </h2>
          <div className="space-y-4">
            {analysis.aiInsights.map((insight, index) => (
              <InsightCard key={index} type={insight.type as any} text={insight.text} />
            ))}
          </div>
        </div>

        
      </div>
    </Layout>
  );
}

// --- Helper Components ---

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) => (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
        <div className="flex items-center space-x-4 space-x-reverse">
            <div className="text-blue-400">{icon}</div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const InsightCard = ({ type, text }: { type: 'strength' | 'weakness' | 'observation', text: string }) => {
    const styles = {
        strength: {
            icon: <CheckCircle className="text-emerald-400" />,
            borderColor: 'border-emerald-500/30',
        },
        weakness: {
            icon: <XCircle className="text-red-400" />,
            borderColor: 'border-red-500/30',
        },
        observation: {
            icon: <Lightbulb className="text-blue-400" />,
            borderColor: 'border-blue-500/30',
        }
    };
    
    return (
        <div className={`flex items-start space-x-4 space-x-reverse rounded-lg p-4 bg-gray-800/60 border ${styles[type].borderColor}`}>
            <div className="flex-shrink-0 mt-1">{styles[type].icon}</div>
            <p className="text-gray-300 leading-relaxed">{text}</p>
        </div>
    );
};
