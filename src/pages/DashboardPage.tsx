import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TradeForm } from '../components/TradeForm';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Trade } from '../lib/supabase';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getLivePrices } from '../apiService'; // سرویس جدید را وارد کنید
import { ManualCloseForm } from '../components/ManualCloseForm';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';


// --- Helper Types & Functions ---

interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '-';
  if (price < 0.001) return price.toFixed(10);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toFixed(1);
};

const DetailItem = ({ label, value }: { label: string, value: string | null | undefined }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
    <p className="text-sm text-gray-200 whitespace-pre-wrap">{value || '-'}</p>
  </div>
);

// --- Main Component ---

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


  // --- Data Fetching ---

  // Inside DashboardPage.tsx

  useEffect(() => {
    const fetchCoinList = async () => {
      try {
        // چک کردن حافظه محلی برای لیست کوین‌ها
        const cachedData = localStorage.getItem('coinListCache');
        const now = new Date().getTime();

        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          // اگر کمتر از ۲۴ ساعت از ذخیره گذشته باشد، از همان استفاده کن
          if (now - timestamp < 24 * 60 * 60 * 1000) {
            setCoinList(data);
            return;
          }
        }

        // در غیر این صورت، لیست جدید را از API بگیر
        const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
        if (!response.ok) throw new Error('Failed to fetch coin list');
        const data: CoinListItem[] = await response.json();

        // ذخیره لیست جدید و زمان فعلی در حافظه محلی
        localStorage.setItem('coinListCache', JSON.stringify({ timestamp: now, data }));
        setCoinList(data);

      } catch (error) {
        console.error("Error fetching CoinGecko coin list:", error);
      }
    };

    fetchCoinList();
  }, []); // این هوک فقط یک بار اجرا می‌شود

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

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  useEffect(() => {
    const fetchPrices = async () => {
      if (coinList.length === 0) return;

      const openTrades = trades.filter(t => t.status === 'open');
      if (openTrades.length === 0) {
        setLivePrices({}); // پاک کردن قیمت‌ها اگر پوزیشن بازی وجود ندارد
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

    const intervalId = setInterval(fetchPrices, 60000); // زمان را می‌توان به ۲ یا ۵ دقیقه افزایش داد
    fetchPrices(); // اجرای اولیه

    return () => clearInterval(intervalId);
  }, [trades, coinList]);

  // --- Handlers & Calculations ---

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
    fetchTrades();
    handleFormClose();
  };

  const toggleRowExpansion = (tradeId: string) => {
    setExpandedRows(prev =>
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
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

  const filteredTrades = trades.filter(trade => filterStatus === 'all' || trade.status === filterStatus);

  const stats = {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    totalPnL: trades.reduce((sum, trade) => sum + calculateLivePnL(trade), 0),
    winRate: trades.filter(t => t.status === 'closed').length > 0
      ? (trades.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length / trades.filter(t => t.status === 'closed').length) * 100
      : 0
  };


  const finalizeTradeClosure = async (trade: Trade, exitPrice: number) => {
    // این تابع منطق اصلی بستن ترید را انجام می‌دهد
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

  // (CHANGE 3) - این تابع پس از تایید کاربر، منطق اصلی را اجرا می‌کند
  const handleConfirmClose = async () => {
    if (!tradeToConfirmClose) return;

    const trade = tradeToConfirmClose;
    const livePrice = livePrices[trade.id] || null;

    setTradeToConfirmClose(null); // بستن مودال تاییدیه

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

  // --- Render Logic ---

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
          <button onClick={() => setShowTradeForm(true)} className="mt-4 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="h-5 w-5" />
            <span>Add Trade</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Total Trades</p><p className="text-2xl font-bold text-white">{stats.totalTrades}</p></div><Activity className="h-8 w-8 text-blue-400" /></div></div>
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Open Positions</p><p className="text-2xl font-bold text-white">{stats.openTrades}</p></div><Calendar className="h-8 w-8 text-orange-400" /></div></div>
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Total P&L</p><p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${stats.totalPnL.toFixed(2)}</p></div><DollarSign className="h-8 w-8 text-emerald-400" /></div></div>
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 border border-gray-700/50"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Win Rate</p><p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p></div><TrendingUp className="h-8 w-8 text-purple-400" /></div></div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl font-semibold text-white mb-4 sm:mb-0">Recent Trades</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')} className="bg-gray-700/50 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="all">All Trades</option>
                  <option value="open">Open Positions</option>
                  <option value="closed">Closed Trades</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTrades.length === 0 ? (
              <div className="p-8 text-center"><div className="text-gray-400 mb-4">{trades.length === 0 ? "No trades yet" : "No trades match the current filter"}</div>{trades.length === 0 && (<button onClick={() => setShowTradeForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">Add Your First Trade</button>)}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left p-4 text-gray-300 font-medium w-12"></th>
                    <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Pair</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Direction</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Size</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Lev</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Entry</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Exit / Current</th>
                    <th className="text-left p-4 text-gray-300 font-medium">P&L</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const pnl = calculateLivePnL(trade);
                    const isLive = trade.status === 'open' && livePrices[trade.id] !== undefined;
                    const isExpanded = expandedRows.includes(trade.id);
                    return (
                      <React.Fragment key={trade.id}>
                        <tr className="border-b border-gray-700/30 hover:bg-gray-700/20">
                          <td className="p-4"><button onClick={() => toggleRowExpansion(trade.id)} className="text-gray-400 hover:text-white">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                          <td className="p-4 text-gray-300 whitespace-nowrap">{new Date(trade.date_time).toLocaleDateString()}</td>
                          <td className="p-4 text-white font-medium">{trade.crypto_pair}</td>
                          <td className="p-4"><div className="flex items-center space-x-1">{trade.direction.toLowerCase().trim() === 'long' ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}<span className={trade.direction.toLowerCase().trim() === 'long' ? 'text-emerald-400' : 'text-red-400'}>{trade.direction.toUpperCase()}</span></div></td>
                          <td className="p-4 text-gray-300">${trade.position_size.toFixed(2)}</td>
                          <td className="p-4 text-gray-300">x{trade.leverage}</td>
                          <td className="p-4 text-gray-300">${formatPrice(trade.entry_price)}</td>
                          <td className="p-4 text-gray-300">${isLive ? formatPrice(livePrices[trade.id]) : formatPrice(trade.exit_price)}</td>
                          <td className="p-4"><span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>${(pnl).toFixed(2)}</span></td>

                          <td className="p-4">
                          {trade.status === 'open' ? (
                            <button
                              // (CHANGE 4) - فراخوانی تابع جدید برای باز کردن مودال تاییدیه
                              onClick={() => initiateCloseTrade(trade)}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/40 transition-colors cursor-pointer"
                              title="Click to close this trade"
                            >
                              {trade.status}
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              {trade.status}
                            </span>
                          )}
                        </td>

                          <td className="p-4"><div className="flex items-center space-x-2"><button onClick={() => handleEdit(trade)} className="text-gray-400 hover:text-blue-400 p-1"><Pencil className="h-4 w-4" /></button><button onClick={() => handleDelete(trade.id)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 className="h-4 w-4" /></button></div></td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-900/50"><td colSpan={11} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                              <div className="space-y-4"><h4 className="font-semibold text-white">تحلیل و دلایل</h4><DetailItem label="استراتژی" value={trade.strategy} /><DetailItem label="شرایط بازار" value={trade.market_conditions} /><DetailItem label="اخبار و فاندامنتال" value={trade.news_and_fundamentals} /></div>
                              <div className="space-y-4"><h4 className="font-semibold text-white">روانشناسی</h4><DetailItem label="احساسات" value={trade.emotions} /><DetailItem label="پایبندی به برنامه" value={trade.plan_adherence} /></div>
                              <div className="space-y-4"><h4 className="font-semibold text-white">اشتباهات و نکات</h4><DetailItem label="اشتباهات" value={trade.mistakes} /><DetailItem label="یادداشت‌ها" value={trade.notes} /></div>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
            {tradeToConfirmClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/20 mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                بستن پوزیشن
              </h3>
              <p className="text-sm text-gray-300 mb-6">
                آیا از بستن پوزیشن <span className="font-bold text-emerald-400">{tradeToConfirmClose.crypto_pair}</span> مطمئن هستید؟
              </p>
              <div className="flex justify-center space-x-4 space-x-reverse">
                <button
                  onClick={() => setTradeToConfirmClose(null)}
                  className="px-6 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 text-white font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                >
                  بله، ببند
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showTradeForm || editingTrade) && <TradeForm onFormSubmit={handleFormSubmit} onClose={handleFormClose} tradeToEdit={editingTrade} />}
       {/* مودال جدید برای بستن دستی پوزیشن */}
      {tradeAwaitingManualClose && (
        <ManualCloseForm
          trade={tradeAwaitingManualClose}
          onClose={() => setTradeAwaitingManualClose(null)}
          onSubmit={handleManualCloseSubmit}
        />
      )}
    </Layout>
  );
}