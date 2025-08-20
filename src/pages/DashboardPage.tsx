import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TradeForm } from '../components/TradeForm';
import { ManualCloseForm } from '../components/ManualCloseForm';
import { DashboardStats } from '../components/DashboardStats';
import { TradesTable } from '../components/TradesTable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Trade } from '../lib/supabase';
import { Plus } from 'lucide-react';
import { getLivePrices } from '../apiService';

interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [coinList, setCoinList] = useState<CoinListItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [tradeAwaitingManualClose, setTradeAwaitingManualClose] = useState<Trade | null>(null);
  const [tradeToConfirmClose, setTradeToConfirmClose] = useState<Trade | null>(null);

  // Fetch coin list
  useEffect(() => {
    const fetchCoinList = async () => {
      try {
        const cachedData = localStorage.getItem('coinListCache');
        const now = new Date().getTime();
        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          if (now - timestamp < 24 * 60 * 60 * 1000) {
            setCoinList(data);
            return;
          }
        }
        const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
        if (!response.ok) throw new Error('Failed to fetch coin list');
        const data: CoinListItem[] = await response.json();
        localStorage.setItem('coinListCache', JSON.stringify({ timestamp: now, data }));
        setCoinList(data);
      } catch (error) {
        console.error("Error fetching CoinGecko coin list:", error);
      }
    };
    fetchCoinList();
  }, []);

  // Fetch trades
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('date_time', { ascending: false });

        if (error) throw error;
        setTrades(data || []);
      } catch (error) {
        console.error('Error fetching trades:', error);
      }
      setLoading(false);
    };
    
    if (user) {
      fetchTrades();
    }
  }, [user]);

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      if (coinList.length === 0) return;
      
      const openTrades = trades.filter(t => t.status === 'open');
      if (openTrades.length === 0) {
        setLivePrices({});
        return;
      }

      const symbols = Array.from(
        new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase()))
      );

      const pricesBySymbol = await getLivePrices(symbols, coinList);

      const newPricesById: { [tradeId: string]: number } = {};
      for (const trade of openTrades) {
        const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
        if (pricesBySymbol[symbol]) {
          newPricesById[trade.id] = pricesBySymbol[symbol];
        }
      }
      setLivePrices(newPricesById);
    };

    const intervalId = setInterval(fetchPrices, 60000);
    fetchPrices();

    return () => clearInterval(intervalId);
  }, [trades, coinList]);

  const finalizeTradeClosure = async (trade: Trade, exitPrice: number) => {
    const quantity = trade.position_size / trade.entry_price;
    const pnl = trade.direction.toLowerCase() === 'long'
      ? (exitPrice - trade.entry_price) * quantity
      : (trade.entry_price - exitPrice) * quantity;
    const finalPnl = pnl * (trade.leverage || 1);

    try {
      const { data, error } = await supabase
        .from('trades')
        .update({ exit_price: exitPrice, pnl: finalPnl, status: 'closed' })
        .eq('id', trade.id)
        .select()
        .single();
      if (error) throw error;
      setTrades(prevTrades => prevTrades.map(t => (t.id === trade.id ? data : t)));
    } catch (error) {
      console.error('Error finalizing trade closure:', error);
      alert('خطا در بستن ترید.');
    }
  };

  const initiateCloseTrade = (trade: Trade) => {
    setTradeToConfirmClose(trade);
  };

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
      } catch (error) {
        console.error('Error deleting trade:', error);
      }
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
      const { data, error } = await supabase.from('trades').select('*').eq('user_id', user.id).order('date_time', { ascending: false });
      if (data) setTrades(data);
    };
    fetchTrades();
    handleFormClose();
  };

  const calculateLivePnL = (trade: Trade): number => {
    if (trade.status === 'closed') return trade.pnl || 0;
    const livePrice = livePrices[trade.id];
    if (!livePrice) return 0;
    const quantity = trade.position_size / trade.entry_price;
    const pnl = trade.direction.toLowerCase() === 'long'
      ? (livePrice - trade.entry_price) * quantity
      : (trade.entry_price - livePrice) * quantity;
    return pnl * (trade.leverage || 1);
  };

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Trading Dashboard</h1>
            <p className="text-gray-300">Track and analyze your trading performance</p>
          </div>
          <button
            onClick={() => setShowTradeForm(true)}
            className="mt-4 sm:mt-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Trade</span>
          </button>
        </div>

        <DashboardStats trades={trades} calculateLivePnL={calculateLivePnL} />

        <TradesTable
          trades={trades}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          livePrices={livePrices}
          expandedRows={expandedRows}
          setExpandedRows={setExpandedRows}
          calculateLivePnL={calculateLivePnL}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCloseTrade={initiateCloseTrade}
          onAddTrade={() => setShowTradeForm(true)}
          tradeToConfirmClose={tradeToConfirmClose}
          setTradeToConfirmClose={setTradeToConfirmClose}
          onConfirmClose={handleConfirmClose}
        />
      </div>

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
