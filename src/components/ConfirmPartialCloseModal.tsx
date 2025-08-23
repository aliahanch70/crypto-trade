import React from 'react';
import type { Trade } from '../lib/supabase';
import { AlertTriangle } from 'lucide-react';

type Props = {
  trade: Trade;
  percentage: number;
  onCancel: () => void;
  onConfirm: () => void;
isSubmitting: boolean; // پراپ جدید

};

export function ConfirmPartialCloseModal({ trade, percentage, onCancel, onConfirm,isSubmitting }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/20 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Confirm Action
          </h3>
          <p className="text-sm text-gray-300 mb-6">
            Are you sure you want to close 
            <span className="font-bold text-white"> {percentage}% </span> 
            of your <span className="font-bold text-emerald-400">{trade.crypto_pair}</span> position?
          </p>
          <div className="flex justify-center space-x-4 space-x-reverse">
            <button
              onClick={onCancel}
              disabled={isSubmitting}

              className=" disabled:opacity-50 px-6 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={isSubmitting}

              className="disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
               {isSubmitting ? 'Confirming...' : 'Yes, Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}