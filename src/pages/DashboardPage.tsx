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
import { useTranslation } from 'react-i18next';
import { PartialCloseModal } from '../components/PartialCloseModal'; // <- مودال جدید
import { ConfirmPartialCloseModal } from '../components/ConfirmPartialCloseModal'; // <- مودال جدید






interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

export function DashboardPage() {
  const { user, isDemoMode } = useAuth(); // <- isDemoMode را بگیرید
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
  const [tradeToPartialClose, setTradeToPartialClose] = useState<Trade | null>(null);
  const [partialCloseDetails, setPartialCloseDetails] = useState<{ trade: Trade; percentage: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


    const { t } = useTranslation('dashboard');

  // اگر به متن‌های مشترک هم نیاز داشتید، می‌توانید دومی را هم فراخوانی کنید
  const { t: tCommon } = useTranslation('common'); 
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
  const fetchTrades = async () => {
      // (CHANGE 3) - منطق جدید برای دریافت داده‌ها
      const userIdToFetch = isDemoMode 
        ? import.meta.env.VITE_DEMO_ADMIN_USER_ID 
        : user?.id;

      if (!userIdToFetch) return;

      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', userIdToFetch)
          .order('date_time', { ascending: false });
        
        if (error) throw error;
        setTrades(data || []);
      } catch (err) { console.error('Error fetching trades:', err); }
      setLoading(false);
    };

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  useEffect(() => {
  const fetchTrades = async () => {
    setLoading(true); // لودینگ را در ابتدای اجرا فعال کن

    const userIdToFetch = isDemoMode 
      ? import.meta.env.VITE_DEMO_ADMIN_USER_ID 
      : user?.id;

    // اگر شناسه‌ای برای دریافت داده وجود نداشت
    if (!userIdToFetch) {
      console.warn("No user ID or demo admin ID available. Cannot fetch trades.");
      setTrades([]); // لیست تریدها را خالی کن
      setLoading(false); // (FIX) لودینگ را در هر صورت متوقف کن
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userIdToFetch)
        .order('date_time', { ascending: false });
      
      if (error) throw error;
      setTrades(data || []);
    } catch (err) { 
      console.error('Error fetching trades:', err);
      setTrades([]); // در صورت خطا هم لیست را خالی کن
    } finally {
      setLoading(false); // در هر صورت (موفق یا ناموفق)، لودینگ را متوقف کن
    }
  };
  
  fetchTrades();
}, [user, isDemoMode]);

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
  if (isSubmitting || !tradeToConfirmClose) return; // اگر در حال ارسال بود، خارج شو
  
  setIsSubmitting(true); // 1. حالت لودینگ را فعال کن
  const trade = tradeToConfirmClose;
  
  try {
    const livePrice = livePrices[trade.id] || null;
    setTradeToConfirmClose(null);
    if (livePrice) {
      await finalizeTradeClosure(trade, livePrice);
    } else {
      setTradeAwaitingManualClose(trade);
    }
  } catch (error) {
    console.error("Error in handleConfirmClose:", error);
  } finally {
    setIsSubmitting(false); // 2. در هر صورت (موفق یا ناموفق)، حالت لودینگ را غیرفعال کن
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

  // (CHANGE 2) - تابع `handlePartialClose` با منطق اصلاح شده و نهایی
  const handleConfirmPartialClose = async () => {
    // اگر درخواستی در حال پردازش است یا جزئیات موجود نیست، خارج شو
    if (isSubmitting || !partialCloseDetails) return;

    // ۱. حالت لودینگ را برای جلوگیری از کلیک‌های تکراری، فعال کن
    setIsSubmitting(true);
    
    const { trade, percentage } = partialCloseDetails;

    try {
        const exitPrice = livePrices[trade.id];
        
        // اگر قیمت لحظه‌ای موجود نبود، عملیات را متوقف کن
        if (!exitPrice) {
            alert("Live price is not available. Cannot close position.");
            // finally بلاک همچنان اجرا خواهد شد تا لودینگ غیرفعال شود
            return;
        }

        // --- محاسبات ---
        const sizeToClose = trade.position_size * (percentage / 100);
        const remainingSize = trade.position_size - sizeToClose;
        const quantityToClose = sizeToClose / trade.entry_price;
        const pnl = trade.direction.toLowerCase() === 'long'
          ? (exitPrice - trade.entry_price) * quantityToClose
          : (trade.entry_price - exitPrice) * quantityToClose;
        const realizedPnl = pnl * (trade.leverage || 1);

        // --- عملیات دیتابیس ---

        // ۲. یک رکورد جدید "بسته شده" برای بخش فروخته شده ایجاد کن
        const { error: insertError } = await supabase.from('trades').insert({
            ...trade,
            id: undefined, // به سوپابیس اجازه بده ID جدید بسازد
            created_at: undefined,
            position_size: sizeToClose,
            status: 'closed',
            exit_price: exitPrice,
            pnl: realizedPnl,
            notes: `Partial close (${percentage}%) of original trade ID: ${trade.id}`
        });

        if (insertError) throw insertError;

        // ۳. رکورد "باز" اصلی را آپدیت یا حذف کن
        if (percentage === 100) {
            // اگر ۱۰۰٪ پوزیشن بسته شده، رکورد اصلی را حذف کن
            const { error: deleteError } = await supabase.from('trades').delete().eq('id', trade.id);
            if (deleteError) throw deleteError;
        } else {
            // اگر بخشی از پوزیشن بسته شده، فقط حجم رکورد اصلی را آپدیت کن
            const { error: updateError } = await supabase.from('trades')
                .update({ position_size: remainingSize })
                .eq('id', trade.id);
            if (updateError) throw updateError;
        }

        // ۴. لیست تریدها را مجدداً بارگذاری کن تا UI به‌روز شود
        await fetchTrades();

    } catch (error) {
        console.error("Error during partial close:", error);
        alert("An error occurred while closing the position. Please try again.");
    } finally {
        // ۵. در هر صورت (موفقیت یا شکست)، مودال و حالت لودینگ را ریست کن
        setPartialCloseDetails(null);
        setIsSubmitting(false);
    }
};

  // (CHANGE 3) - این تابع، مودال تاییدیه را باز می‌کند
  const initiatePartialCloseConfirmation = (trade: Trade, percentage: number) => {
    setTradeToPartialClose(null); // بستن مودال اول (انتخاب درصد)
    setPartialCloseDetails({ trade, percentage }); // باز کردن مودال دوم (تاییدیه)
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
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            <p className="text-gray-300">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => setShowTradeForm(true)}
                    disabled={isDemoMode} // <- غیرفعال کردن

            className="mt-4 sm:mt-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>{t('add_trade_button')}</span>
          </button>
        </div>

        <DashboardStats trades={trades} calculateLivePnL={calculateLivePnL} />

       <TradesTable
               isDemoMode={isDemoMode} // <- پراپ جدید برای غیرفعال کردن دکمه‌ها در کامپوننت فرزند

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
          onInitiatePartialClose={(trade) => setTradeToPartialClose(trade)}

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
      {/* (CHANGE 4) - رندر کردن مودال جدید */}
       {tradeToPartialClose && (
        <PartialCloseModal
            trade={tradeToPartialClose}
            livePrice={livePrices[tradeToPartialClose.id]}
            onClose={() => setTradeToPartialClose(null)}
            onInitiatePartialClose={initiatePartialCloseConfirmation}
        />
      )}
      
      {/* مودال تاییدیه نهایی برای بستن بخشی از پوزیشن */}
      {partialCloseDetails && (
      <ConfirmPartialCloseModal
        trade={partialCloseDetails.trade}
        percentage={partialCloseDetails.percentage}
        onCancel={() => setPartialCloseDetails(null)}
        onConfirm={handleConfirmPartialClose}
        isSubmitting={isSubmitting} // <- پراپ جدید برای مودال
      />
    )}
    </Layout>
  );
}
