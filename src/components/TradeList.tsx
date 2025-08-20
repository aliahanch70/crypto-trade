// src/components/TradeList.tsx

import React from 'react';
import type { Trade } from '../lib/supabase';
import {
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// --- Helper Components ---

const InfoItem = ({ label, value, valueClassName = 'text-gray-200' }: { label: string; value: string; valueClassName?: string }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className={`font-medium ${valueClassName}`}>{value}</p>
  </div>
);

const DetailItem = ({ label, value }: { label: string, value: string | null | undefined }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
    <p className="text-sm text-gray-200 whitespace-pre-wrap">{value || '-'}</p>
  </div>
);

// --- Main Component Props ---

type Props = {
  trades: Trade[];
  livePrices: { [key: string]: number };
  expandedRows: string[];
  calculateLivePnL: (trade: Trade) => number;
  formatPrice: (price: number | null | undefined) => string;
  onToggleExpand: (tradeId: string) => void;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onCloseTrade: (trade: Trade) => void;
};

// --- Main Component ---

export function TradeList({
  trades,
  livePrices,
  expandedRows,
  calculateLivePnL,
  formatPrice,
  onToggleExpand,
  onEdit,
  onDelete,
  onCloseTrade
}: Props) {

  if (trades.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">No trades to display.</div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden md:block">
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
            {trades.map((trade) => {
              const pnl = calculateLivePnL(trade);
              const isLive = trade.status === 'open' && livePrices[trade.id] !== undefined;
              const isExpanded = expandedRows.includes(trade.id);
              return (
                <React.Fragment key={trade.id}>
                  <tr className="border-b border-gray-700/30 hover:bg-gray-700/20">
                    <td className="p-4"><button onClick={() => onToggleExpand(trade.id)} className="text-gray-400 hover:text-white">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td>
                    <td className="p-4 text-gray-300 whitespace-nowrap">{new Date(trade.date_time).toLocaleDateString()}</td>
                    <td className="p-4 text-white font-medium">{trade.crypto_pair}</td>
                    <td className="p-4"><div className="flex items-center space-x-1">{trade.direction.toLowerCase() === 'long' ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}<span className={trade.direction.toLowerCase() === 'long' ? 'text-emerald-400' : 'text-red-400'}>{trade.direction.toUpperCase()}</span></div></td>
                    <td className="p-4 text-gray-300">${trade.position_size.toFixed(2)}</td>
                    <td className="p-4 text-gray-300">x{trade.leverage}</td>
                    <td className="p-4 text-gray-300">${formatPrice(trade.entry_price)}</td>
                    <td className="p-4 text-gray-300">${isLive ? formatPrice(livePrices[trade.id]) : formatPrice(trade.exit_price)}</td>
                    <td className="p-4"><span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>${pnl.toFixed(2)}</span></td>
                    <td className="p-4">{trade.status === 'open' ? <button onClick={() => onCloseTrade(trade)} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/40 transition-colors" title="Click to close trade">{trade.status}</button> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">{trade.status}</span>}</td>
                    <td className="p-4"><div className="flex items-center space-x-2"><button onClick={() => onEdit(trade)} className="p-1 text-gray-400 hover:text-blue-400"><Pencil size={16} /></button><button onClick={() => onDelete(trade.id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button></div></td>
                  </tr>
                  {isExpanded && <tr className="bg-gray-900/50"><td colSpan={11} className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6"><div className="space-y-4"><h4 className="font-semibold text-white">تحلیل و دلایل</h4><DetailItem label="استراتژی" value={trade.strategy} /><DetailItem label="شرایط بازار" value={trade.market_conditions} /><DetailItem label="اخبار و فاندامنتال" value={trade.news_and_fundamentals} /></div><div className="space-y-4"><h4 className="font-semibold text-white">روانشناسی</h4><DetailItem label="احساسات" value={trade.emotions} /><DetailItem label="پایبندی به برنامه" value={trade.plan_adherence} /></div><div className="space-y-4"><h4 className="font-semibold text-white">اشتباهات و نکات</h4><DetailItem label="اشتباهات" value={trade.mistakes} /><DetailItem label="یادداشت‌ها" value={trade.notes} /></div></div></td></tr>}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="p-4 space-y-4">
          {trades.map((trade) => {
            const pnl = calculateLivePnL(trade);
            const isLive = trade.status === 'open' && livePrices[trade.id] !== undefined;
            const isExpanded = expandedRows.includes(trade.id);
            return (
              <div key={trade.id} className="bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg text-white">{trade.crypto_pair}</div>
                      <div className="text-xs text-gray-400">{new Date(trade.date_time).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {trade.direction.toLowerCase() === 'long' ? <ArrowUpRight size={16} className="text-emerald-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
                      <span className={`font-semibold ${trade.direction.toLowerCase() === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>{trade.direction.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <InfoItem label="P&L" value={`$${pnl.toFixed(2)}`} valueClassName={pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'} />
                    <InfoItem label="Size" value={`$${trade.position_size.toFixed(2)}`} />
                    <InfoItem label="Entry" value={`$${formatPrice(trade.entry_price)}`} />
                    <InfoItem label="Exit / Current" value={`$${isLive ? formatPrice(livePrices[trade.id]) : formatPrice(trade.exit_price)}`} />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-700/50 pt-4 mt-4">
                    <div>
                      {trade.status === 'open' ? <button onClick={() => onCloseTrade(trade)} className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 hover:bg-yellow-500/40">OPEN</button> : <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">CLOSED</span>}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => onEdit(trade)} className="p-2 text-gray-400 hover:text-blue-400"><Pencil size={18} /></button>
                      <button onClick={() => onDelete(trade.id)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={18} /></button>
                      <button onClick={() => onToggleExpand(trade.id)} className="p-2 text-gray-400 hover:text-white">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                    </div>
                  </div>
                </div>
                {isExpanded && <div className="p-4 border-t border-gray-700/50 space-y-4"><h4 className="font-semibold text-white">Journal Details</h4><DetailItem label="Strategy" value={trade.strategy}/><DetailItem label="Market Conditions" value={trade.market_conditions}/><DetailItem label="Emotions" value={trade.emotions}/><DetailItem label="Mistakes" value={trade.mistakes}/></div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}