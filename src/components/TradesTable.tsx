import React from 'react';
import {
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Scissors
} from 'lucide-react';
import type { Trade } from '../lib/supabase';

interface TradesTableProps {
  trades: Trade[];
  filterStatus: 'all' | 'open' | 'closed';
  setFilterStatus: (status: 'all' | 'open' | 'closed') => void;
  livePrices: { [key: string]: number };
  expandedRows: string[];
  setExpandedRows: React.Dispatch<React.SetStateAction<string[]>>;
  calculateLivePnL: (trade: Trade) => number;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onCloseTrade: (trade: Trade) => void;
  onAddTrade: () => void;
  tradeToConfirmClose: Trade | null;
  setTradeToConfirmClose: React.Dispatch<React.SetStateAction<Trade | null>>;
  onConfirmClose: () => void;
  onInitiatePartialClose: (trade: Trade) => void; // پراپ جدید
isDemoMode: boolean; // پراپ جدید
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

const InfoItem = ({ label, value, valueClassName = 'text-gray-200' }: { label: string; value: string; valueClassName?: string }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className={`font-medium ${valueClassName}`}>{value}</p>
  </div>
);

export function TradesTable({
  trades,
  filterStatus,
  setFilterStatus,
  livePrices,
  expandedRows,
  setExpandedRows,
  calculateLivePnL,
  onEdit,
  onDelete,
  onCloseTrade,
  onAddTrade,
  tradeToConfirmClose,
  setTradeToConfirmClose,
  onConfirmClose,
  onInitiatePartialClose,
  isDemoMode
}: TradesTableProps) {
  const toggleRowExpansion = (tradeId: string) => {
    setExpandedRows(prev =>
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const filteredTrades = trades.filter(trade => filterStatus === 'all' || trade.status === filterStatus);
  const hasOpenTrades = trades.some(trade => trade.status === 'open');

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h2 className="text-xl font-semibold text-white mb-4 sm:mb-0">Recent Trades</h2>
            <div className="flex items-center space-x-4">

              {/* --- این دکمه‌ای است که باید اضافه شود --- */}


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
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                {trades.length === 0 ? "No trades yet" : "No trades match the current filter"}
              </div>
              {trades.length === 0 && (
                <button onClick={onAddTrade} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">
                  Add Your First Trade
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="p-4 w-12"></th>
                  <th className="p-4 text-left font-medium text-gray-300">Date</th>
                  <th className="p-4 text-left font-medium text-gray-300">Pair</th>
                  <th className="p-4 text-left font-medium text-gray-300">Direction</th>
                  <th className="p-4 text-left font-medium text-gray-300">Size</th>
                  <th className="p-4 text-left font-medium text-gray-300">Lev</th>
                  <th className="p-4 text-left font-medium text-gray-300">Entry</th>
                  <th className="p-4 text-left font-medium text-gray-300">Exit / Current</th>
                  <th className="p-4 text-left font-medium text-gray-300">P&L</th>
                  <th className="p-4 text-left font-medium text-gray-300">Status</th>
                  <th className="p-4 text-left font-medium text-gray-300">Actions</th>
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
                        <td className="p-4">
                          <button onClick={() => toggleRowExpansion(trade.id)} className="text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="p-4 text-gray-300 whitespace-nowrap">
                          {new Date(trade.date_time).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-white font-medium">{trade.crypto_pair}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1">
                            {trade.direction.toLowerCase() === 'long' ?
                              <ArrowUpRight className="h-4 w-4 text-emerald-400" /> :
                              <ArrowDownRight className="h-4 w-4 text-red-400" />
                            }
                            <span className={trade.direction.toLowerCase() === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                              {trade.direction.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300">${trade.position_size.toFixed(2)}</td>
                        <td className="p-4 text-gray-300">x{trade.leverage}</td>
                        <td className="p-4 text-gray-300">${formatPrice(trade.entry_price)}</td>
                        <td className="p-4 text-gray-300">
                          ${isLive ? formatPrice(livePrices[trade.id]) : formatPrice(trade.exit_price)}
                        </td>
                        <td className="p-4">
                          <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            ${pnl.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          {trade.status === 'open' ? (
                            <button
                              onClick={() => onCloseTrade(trade)}
                              disabled={isDemoMode} // <- (CHANGE 2) غیرفعال کردن

                              className="min-w-[73px] min-h-[10px] px-3 py-1 text-xs font-medium bg-yellow-500/20 text-red-400 rounded-full border border-yellow-500/30 hover:bg-yellow-500/40"
                            >
                              Close All
                            </button>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                              CLOSED
                            </span>
                          )}
                        </td>
                        <td className="p-4">

                          <div className="flex justify-end  space-x-2">
                            {trade.status === 'open' && (
                            <button 
                            disabled={isDemoMode} // <- (CHANGE 2) غیرفعال کردن

                            onClick={() => onInitiatePartialClose(trade)} 
                            className="min-w-[70px] px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 hover:bg-yellow-500/40"
                              title="Close Partially">
                              Close %
                            </button>
                          )}
                            <button disabled={isDemoMode} onClick={() => onEdit(trade)} className="p-1 text-gray-400 hover:text-blue-400">
                              <Pencil size={16} />
                            </button>
                            <button disabled={isDemoMode} onClick={() => onDelete(trade.id)} className="p-1 text-gray-400 hover:text-red-400">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>

                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-900/50">
                          <td colSpan={11} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-white">تحلیل و دلایل</h4>
                                <DetailItem label="استراتژی" value={trade.strategy} />
                                <DetailItem label="شرایط بازار" value={trade.market_conditions} />
                                <DetailItem label="اخبار و فاندامنتال" value={trade.news_and_fundamentals} />
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold text-white">روانشناسی</h4>
                                <DetailItem label="احساسات" value={trade.emotions} />
                                <DetailItem label="پایبندی به برنامه" value={trade.plan_adherence} />
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold text-white">اشتباهات و نکات</h4>
                                <DetailItem label="اشتباهات" value={trade.mistakes} />
                                <DetailItem label="یادداشت‌ها" value={trade.notes} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                {trades.length === 0 ? "No trades yet" : "No trades match the current filter"}
              </div>
              {trades.length === 0 && (
                <button onClick={onAddTrade} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">
                  Add Your First Trade
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredTrades.map((trade) => {
                const pnl = calculateLivePnL(trade);
                const isLive = trade.status === 'open' && livePrices[trade.id] !== undefined;
                const isExpanded = expandedRows.includes(trade.id);
                return (
                  <div key={trade.id} className="bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-lg text-white">{trade.crypto_pair}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(trade.date_time).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {trade.direction.toLowerCase() === 'long' ?
                            <ArrowUpRight size={16} className="text-emerald-400" /> :
                            <ArrowDownRight size={16} className="text-red-400" />
                          }
                          <span className={`font-semibold ${trade.direction.toLowerCase() === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.direction.toUpperCase()} {trade.leverage}X
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <InfoItem
                          label="P&L"
                          value={`$${pnl.toFixed(2)}`}
                          valueClassName={pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}
                        />
                        <InfoItem label="Size" value={`$${trade.position_size.toFixed(2)}`} />
                        <InfoItem label="Entry" value={`$${formatPrice(trade.entry_price)}`} />
                        <InfoItem
                          label="Exit / Current"
                          value={`$${isLive ? formatPrice(livePrices[trade.id]) : formatPrice(trade.exit_price)}`}
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-700/50 pt-4 mt-4">
                        <div>
                          {trade.status === 'open' ? (
                            <button
                              onClick={() => onCloseTrade(trade)}
                              disabled={isDemoMode} // <- (CHANGE 2) غیرفعال کردن

                              className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-red-400 rounded-full border border-yellow-500/30 hover:bg-yellow-500/40"
                            >
                              Close All
                            </button>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                              CLOSED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">

                          {trade.status === 'open' && (
                            <button onClick={() => onInitiatePartialClose(trade)} disabled={isDemoMode} className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 hover:bg-yellow-500/40"
                              title="Close Partially">
                              Close %
                            </button>
                          )}
                          <button disabled={isDemoMode} onClick={() => onEdit(trade)} className="p-2 text-gray-400 hover:text-blue-400">
                            <Pencil size={18} />
                          </button>
                          <button disabled={isDemoMode} onClick={() => onDelete(trade.id)} className="p-2 text-gray-400 hover:text-red-400">
                            <Trash2 size={18} />
                          </button>
                          <button disabled={isDemoMode} onClick={() => toggleRowExpansion(trade.id)} className="p-2 text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-700/50 space-y-4">
                        <h4 className="font-semibold text-white">Journal Details</h4>
                        <DetailItem label="Strategy" value={trade.strategy} />
                        <DetailItem label="Market Conditions" value={trade.market_conditions} />
                        <DetailItem label="Emotions" value={trade.emotions} />
                        <DetailItem label="Mistakes" value={trade.mistakes} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {tradeToConfirmClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/20 mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Close Position</h3>
              <p className="text-sm text-gray-300 mb-6">
                Are you sure you want to close the <span className="font-bold text-emerald-400">{tradeToConfirmClose.crypto_pair}</span> position?
              </p>
              <div className="flex justify-center space-x-4 space-x-reverse">
                <button
                  onClick={() => setTradeToConfirmClose(null)}
                  
                  className="px-6 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmClose}
                  disabled={isDemoMode} // <- (CHANGE 2) غیرفعال کردن

                  className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                >
                  Yes, Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
