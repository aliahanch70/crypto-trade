// src/components/ManualCloseForm.tsx

import React, { useState } from 'react';
import type { Trade } from '../lib/supabase';
import { X, CheckCircle } from 'lucide-react';

type Props = {
  trade: Trade;
  onClose: () => void;
  onSubmit: (exitPrice: number) => void;
};

export function ManualCloseForm({ trade, onClose, onSubmit }: Props) {
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('لطفاً یک قیمت معتبر وارد کنید.');
      return;
    }
    setError('');
    onSubmit(parsedPrice);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              بستن دستی پوزیشن
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-300 mb-6">
            قیمت لحظه‌ای برای <span className="font-semibold text-emerald-400">{trade.crypto_pair}</span> در دسترس نیست. لطفاً قیمت خروج را وارد کنید.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="exitPrice" className="block text-sm font-medium text-gray-300 mb-2">
                قیمت خروج (Exit Price)
              </label>
              <input
                id="exitPrice"
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                placeholder="0.00"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <CheckCircle size={20} />
              <span>ثبت و بستن پوزیشن</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}