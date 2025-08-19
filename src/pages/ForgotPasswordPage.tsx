import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom'; // یا هر ابزار ناوبری که استفاده می‌کنید

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // این آدرس صفحه‌ای است که کاربر بعد از کلیک روی لینک ایمیل به آن هدایت می‌شود
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      setMessage('ایمیل بازیابی رمز عبور برای شما ارسال شد. لطفاً صندوق ورودی خود را چک کنید.');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-white">فراموشی رمز عبور</h1>
        <p className="text-center text-gray-400">ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">ایمیل</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
          </button>
        </form>
        {message && <p className="text-sm text-center text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-center text-red-400">{error}</p>}
        <div className="text-center">
          <Link to="/login" className="text-sm text-emerald-400 hover:underline">بازگشت به صفحه ورود</Link>
        </div>
      </div>
    </div>
  );
}