import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// متغیرهای محیطی را از Netlify می‌خوانیم
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // متغیر جدید

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تابع اصلی که Netlify هر ۵ دقیقه اجرا می‌کند
export const handler = async () => {
  console.log("Function starting...");

  try {
    // --- پیام راه‌اندازی برای ادمین ---
    if (TELEGRAM_ADMIN_CHAT_ID) {
      // این پیام فقط برای شما ارسال می‌شود تا از صحت عملکرد تابع مطمئن شوید
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, "✅ Trade Journal Bot check started...");
    }

    // 1. تمام پوزیشن‌های باز را از دیتابیس بگیر
    const { data: openTrades, error: tradesError } = await supabase
      .from('trades')
      .select(`*, profiles (telegram_chat_id, profit_alert_percent)`)
      .eq('status', 'open');

    if (tradesError) throw tradesError;
    if (!openTrades || openTrades.length === 0) {
      console.log("No open trades to check.");
      return { statusCode: 200, body: "No open trades." };
    }

    // 2. قیمت‌های لحظه‌ای را بگیر
    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    const livePrices: { [key: string]: number } = {};
    if (symbols.length > 0) {
        const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols.map(s => `${s}USDT`))}`);
        const allPrices = await priceResponse.json() as Array<{ symbol: string; price: string }>;
        allPrices.forEach((ticker: any) => {
            const symbol = ticker.symbol.replace('USDT', '');
            livePrices[symbol] = parseFloat(ticker.price);
        });
    }

    // --- ساخت گزارش‌های دوره‌ای برای هر کاربر ---
    const reportsByUser: { [chatId: string]: string } = {};

    // 3. هر پوزیشن را برای ارسال نوتیفیکیشن چک کن
    for (const trade of openTrades) {
      const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
      const currentPrice = livePrices[symbol];
      const userChatId = trade.profiles?.telegram_chat_id;

      if (!currentPrice || !userChatId) continue;

      const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction === 'long' ? 1 : -1);
      const liquidationPrice = trade.direction === 'long'
        ? trade.entry_price * (1 - (1 / trade.leverage))
        : trade.entry_price * (1 + (1 / trade.leverage));
      const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / liquidationPrice) * 100;
      
      // --- بخش اول: هشدارهای فوری (مثل قبل) ---
      let urgentAlertMessage = '';
      if (trade.profiles?.profit_alert_percent && pnlPercentage >= trade.profiles.profit_alert_percent) {
        urgentAlertMessage = `✅ Profit Alert for ${trade.crypto_pair}!\nCurrent PNL is ${pnlPercentage.toFixed(2)}%`;
      }
      if (distanceToLiquidation < 5) {
        urgentAlertMessage = `🚨 Liquidation Warning for ${trade.crypto_pair}!\nCurrent price is ${currentPrice}. Liquidation at approx. ${liquidationPrice.toFixed(4)}.`;
      }
      if (urgentAlertMessage) {
        await sendTelegramNotification(userChatId, urgentAlertMessage);
      }
      
      // --- بخش دوم: افزودن به گزارش دوره‌ای ---
      if (!reportsByUser[userChatId]) {
        reportsByUser[userChatId] = "📊 **Your 5-Minute Open Positions Report:**\n\n";
      }
      
      const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
      reportsByUser[userChatId] += `🔹 **${trade.crypto_pair}** (${trade.direction})\n`;
      reportsByUser[userChatId] += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}%\n`;
      reportsByUser[userChatId] += `   - Entry: ${trade.entry_price.toFixed(4)}\n`;
      reportsByUser[userChatId] += `   - Current: ${currentPrice.toFixed(4)}\n\n`;
    }

    // 4. ارسال گزارش‌های تلفیقی برای هر کاربر
    for (const chatId in reportsByUser) {
      await sendTelegramNotification(chatId, reportsByUser[chatId], true); // parse_mode: Markdown
    }

    console.log("Function finished successfully.");
    return { statusCode: 200, body: JSON.stringify({ message: "Checks complete." }) };
  } catch (error) {
    console.error("Function failed:", error);
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `❌ Bot Error: ${error.message}`);
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

// تابع کمکی برای ارسال پیام به تلگرام (با قابلیت Markdown)
async function sendTelegramNotification(chatId: string, message: string, useMarkdown: boolean = false) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: message,
  };
  if (useMarkdown) {
    body.parse_mode = 'Markdown';
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(`Notification sent to chat ID ${chatId}`);
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}