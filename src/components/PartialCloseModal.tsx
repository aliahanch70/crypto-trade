import React from 'react';
import type { Trade } from '../lib/supabase';
import { X, Scissors } from 'lucide-react';

type Props = {
  trade: Trade;
  livePrice: number | undefined;
  onClose: () => void;
  // این تابع دیگر پوزیشن را نمی‌بندد، بلکه فرآیند تایید را آغاز می‌کند
  onInitiatePartialClose: (trade: Trade, percentage: number) => void;
};

export function PartialCloseModal({ trade, livePrice, onClose, onInitiatePartialClose }: Props) {
  const percentages = [25, 50, 75, 100];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Scissors size={20} className="mr-2 text-indigo-400" />
              Close Position Partially
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full"><X size={24} /></button>
          </div>
          <p className="text-gray-300 mb-2">
            Select the portion of <span className="font-semibold text-emerald-400">{trade.crypto_pair}</span> you want to close.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Current Price: <span className="font-mono text-white">${livePrice ? livePrice.toFixed(4) : '...'}</span>
          </p>
          
          {!livePrice ? (
            <p className="text-center text-orange-400 py-4">Live price is not available. Please wait a moment.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {percentages.map(p => (
                <button
                  key={p}
                  onClick={() => onInitiatePartialClose(trade, p)}
                  className="bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors text-center"
                >
                  {p}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}