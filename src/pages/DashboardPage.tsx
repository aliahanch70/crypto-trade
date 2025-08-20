// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TradeForm } from '../components/TradeForm';
import { ManualCloseForm } from '../components/ManualCloseForm';
import { StatsGrid } from '../components/StatsGrid';
import { TradeList } from '../components/TradeList';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Trade } from '../lib/supabase';
import { Plus, Filter, AlertTriangle } from 'lucide-react';

// --- Helper Functions outside component ---
const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '-';
  if (price < 0.001) return price.toFixed(10);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toFixed(1);
};


export function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [tradeAwaitingManualClose, setTradeAwaitingManualClose] = useState<Trade | null>(null);
  const [tradeToConfirmClose, setTradeToConfirmClose] = useState<Trade | null>(null);


  

  // --- Data Fetching & Side Effects (useEffect hooks) ---
  useEffect(() => {
    // This assumes you have an apiService.ts file for live prices.
    // For simplicity, this part is kept conceptual.
    // The live price fetching logic would go in a useEffect hook here.
  }, [trades]);
  
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('date_time', { ascending: false });
        if (error) throw error;
        setTrades(data || []);
      } catch (error) { console.error('Error fetching trades:', error); }
      setLoading(false);
    };
    if (user) fetchTrades();
  }, [user]);

  // --- Handlers & Logic ---

  const finalizeTradeClosure = async (trade: Trade, exitPrice: number) => {
    const quantity = trade.position_size / trade.entry_price;
    const pnl = trade.direction.toLowerCase() === 'long'
      ? (exitPrice - trade.entry_price) * quantity
      : (trade.entry_price - exitPrice) * quantity;
    const finalPnl = pnl * (trade.leverage || 1);

    try {
      const { data, error } = await supabase
        .from('trades').update({ exit_price: exitPrice, pnl: finalPnl, status: 'closed' })
        .eq('id', trade.id).select().single();
      if (error) throw error;
      setTrades(prevTrades => prevTrades.map(t => (t.id === trade.id ? data : t)));
    } catch (error) {
      console.error('Error closing trade:', error);
      alert('خطا در بستن ترید.');
    }
  };

  const initiateCloseTrade = (trade: Trade) => setTradeToConfirmClose(trade);
  const handleConfirmClose = async () => {
    if (!tradeToConfirmClose) return;
    const trade = tradeToConfirmClose;
    const livePrice = livePrices[trade.id] || null;
    setTradeToConfirmClose(null);
    if (livePrice) {
      await finalizeTradeClosure(trade, livePrice);
    } else {
      setTradeAwaitingManualClose(trade);
    }
  };
  const handleManualCloseSubmit = async (exitPrice: number) => {
    if (!tradeAwaitingManualClose) return;
    await finalizeTradeClosure(tradeAwaitingManualClose, exitPrice);
    setTradeAwaitingManualClose(null);
  };
  const handleDelete = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        const { error } = await supabase.from('trades').delete().eq('id', tradeId);
        if (error) throw error;
        setTrades(trades.filter(t => t.id !== tradeId));
      } catch (error) { console.error('Error deleting trade:', error); }
    }
  };
  const handleEdit = (trade: Trade) => setEditingTrade(trade);
  const handleFormClose = () => {
    setShowTradeForm(false);
    setEditingTrade(null);
  };
  const handleFormSubmit = () => {
      const fetchTrades = async () => {
        if (!user) return;
        const { data } = await supabase.from('trades').select('*').eq('user_id', user.id).order('date_time', { ascending: false });
        if(data) setTrades(data);
    };
    fetchTrades();
    handleFormClose();
  };
  const toggleRowExpansion = (tradeId: string) => setExpandedRows(prev => prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]);
  const calculateLivePnL = (trade: Trade): number => {
    if (trade.status === 'closed') return trade.pnl || 0;
    const livePrice = livePrices[trade.id];
    if (!livePrice) return 0;
    const quantity = trade.position_size / trade.entry_price;
    const pnl = trade.direction.toLowerCase() === 'long' ? (livePrice - trade.entry_price) * quantity : (trade.entry_price - livePrice) * quantity;
    return pnl * (trade.leverage || 1);
  };
  
  const filteredTrades = trades.filter(trade => filterStatus === 'all' || trade.status === filterStatus);
  const stats = {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    totalPnL: trades.reduce((sum, trade) => sum + calculateLivePnL(trade), 0),
    winRate: trades.filter(t => t.status === 'closed').length > 0 ? (trades.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length / trades.filter(t => t.status === 'closed').length) * 100 : 0
  };

  if (loading) {
    // ... Loading UI JSX
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Trading Dashboard</h1>
            <p className="text-gray-300">Track and analyze your trading performance</p>
          </div>
          <button onClick={() => setShowTradeForm(true)} className="mt-4 sm:mt-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <Plus className="h-5 w-5" />
            <span>Add Trade</span>
          </button>
        </div>

        <StatsGrid stats={stats} />

        <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl font-semibold text-white mb-4 sm:mb-0">Recent Trades</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-gray-700/50 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="all">All Trades</option>
                  <option value="open">Open Positions</option>
                  <option value="closed">Closed Trades</option>
                </select>
              </div>
            </div>
          </div>
          
          <TradeList
            trades={filteredTrades}
            livePrices={livePrices}
            expandedRows={expandedRows}
            calculateLivePnL={calculateLivePnL}
            formatPrice={formatPrice}
            onToggleExpand={toggleRowExpansion}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCloseTrade={initiateCloseTrade}
          />
        </div>
      </div>
      
      {tradeToConfirmClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/20 mb-4"><AlertTriangle className="h-6 w-6 text-orange-400" /></div>
              <h3 className="text-lg font-medium text-white mb-2">Close Position</h3>
              <p className="text-sm text-gray-300 mb-6">Are you sure you want to close the <span className="font-bold text-emerald-400">{tradeToConfirmClose.crypto_pair}</span> position?</p>
              <div className="flex justify-center space-x-4 space-x-reverse">
                <button onClick={() => setTradeToConfirmClose(null)} className="px-6 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 text-white font-medium transition-colors">Cancel</button>
                <button onClick={handleConfirmClose} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors">Yes, Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tradeAwaitingManualClose && (
        <ManualCloseForm
          trade={tradeAwaitingManualClose}
          onClose={() => setTradeAwaitingManualClose(null)}
          onSubmit={handleManualCloseSubmit}
        />
      )}

      {(showTradeForm || editingTrade) && (
        <TradeForm
          onFormSubmit={handleFormSubmit}
          onClose={handleFormClose}
          tradeToEdit={editingTrade}
        />
      )}
    </Layout>
  );
}