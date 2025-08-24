import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// نوع داده‌ها را تعریف می‌کنیم
interface Trade {
  id: string;
  user_id: string;
  crypto_pair: string;
  direction: 'long' | 'short';
  entry_price: number;
  position_size: number;
  leverage: number;
  // فرض می‌کنیم کاربر در پروفایل خود این دو را ذخیره کرده
  user_telegram_chat_id: string; 
  user_profit_alert_percent: number;
}

// متغیرهای محیطی را از Netlify می‌خوانیم
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تابع اصلی که Netlify اجرا می‌کند
export const handler = async () => {
  try {
    // 1. تمام پوزیشن‌های باز را از دیتابیس بگیر
    const { data: openTrades, error: tradesError } = await supabase
      .from('trades')
      .select(`
        *,
        profiles (
          telegram_chat_id,
          profit_alert_percent
        )
      `)
      .eq('status', 'open');

    if (tradesError) throw tradesError;
    if (!openTrades || openTrades.length === 0) {
      console.log("No open trades to check.");
      return { statusCode: 200, body: "No open trades." };
    }

    // 2. لیست ارزها را برای گرفتن قیمت آماده کن
    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    
    // 3. قیمت‌های لحظه‌ای را از یک API بگیر (مثلاً بایننس)
    const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price');
    const allPrices = await priceResponse.json();
    const livePrices: { [key: string]: number } = {};
    allPrices.forEach((ticker: any) => {
        const symbol = ticker.symbol.replace('USDT', '');
        if (symbols.includes(symbol)) {
            livePrices[symbol] = parseFloat(ticker.price);
        }
    });

    // 4. هر پوزیشن را برای ارسال نوتیفیکیشن چک کن
    for (const trade of openTrades) {
      const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
      const currentPrice = livePrices[symbol];
      const userChatId = trade.profiles.telegram_chat_id;
      const profitAlertPercent = trade.profiles.profit_alert_percent;

      if (!currentPrice || !userChatId) continue;

      // محاسبه سود/ضرر لحظه‌ای
      const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction === 'long' ? 1 : -1);

      // محاسبه قیمت لیکویید شدن (تخمینی)
      const liquidationPrice = trade.direction === 'long'
        ? trade.entry_price * (1 - (1 / trade.leverage))
        : trade.entry_price * (1 + (1 / trade.leverage));
      
      const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / liquidationPrice) * 100;

      // --- منطق ارسال نوتیفیکیشن ---
      let notificationMessage = '';
      
      // شرط 1: رسیدن به حد سود
      if (profitAlertPercent && pnlPercentage >= profitAlertPercent) {
        notificationMessage = `✅ Profit Alert for ${trade.crypto_pair}!\nCurrent PNL is ${pnlPercentage.toFixed(2)}%`;
      }
      
      // شرط 2: نزدیک شدن به لیکوییدی
      if (distanceToLiquidation < 5) { // مثلاً اگر کمتر از ۵٪ فاصله داشت
        notificationMessage = `🚨 Liquidation Warning for ${trade.crypto_pair}!\nCurrent price is ${currentPrice}. Liquidation at approx. ${liquidationPrice.toFixed(4)}.`;
      }

      if (notificationMessage) {
        await sendTelegramNotification(userChatId, notificationMessage);
        // اینجا می‌توانید یک رکورد در دیتابیس برای جلوگیری از ارسال پیام تکراری ثبت کنید
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Checks complete." }) };
  } catch (error) {
    console.error("Function failed:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// تابع کمکی برای ارسال پیام به تلگرام
async function sendTelegramNotification(chatId: string, message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
    console.log(`Notification sent to chat ID ${chatId}`);
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}