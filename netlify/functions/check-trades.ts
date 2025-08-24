import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile {
  telegram_chat_id: string;
  profit_alert_percent: number;
  full_name: string;
  [key: string]: any;
}

interface Trade {
  id: string;
  crypto_pair: string;
  direction: 'long' | 'short';
  entry_price: number;
  position_size: number;
  leverage: number;
  profiles: Profile | null;
}

interface BinanceTicker {
  symbol: string;
  price: string;
}

// --- Environment Variables & Clients ---
const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID,
} = process.env;

const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- 1. Service Functions (توابع متخصص) ---
// ==================================================================

/**
 * Service to send a notification via Telegram.
 */
async function sendTelegramNotification(chatId: string, message: string, useMarkdown = false) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: useMarkdown ? 'Markdown' : 'none' }),
    });
    if (!response.ok) {
      console.error(`Failed to send message to ${chatId}:`, await response.json());
    }
  } catch (error) {
    console.error("Telegram notification failed:", error);
  }
}

/**
 * Service to fetch all open trades from the database.
 */
async function getOpenTrades(client: SupabaseClient): Promise<Trade[]> {
  const { data, error } = await client
    .from('trades')
    .select(`*, profiles (*)`)
    .eq('status', 'open');
  if (error) throw new Error(`Failed to fetch trades: ${error.message}`);
  return data || [];
}

/**
 * Service to fetch live prices for a list of symbols.
 */
async function getLivePrices(symbols: string[]): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();
  const livePrices = new Map<string, number>();
  try {
    const binancePairs = symbols.map(s => `${s}USDT`);
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(binancePairs)}`);
    if (response.ok) {
      const allPrices = (await response.json()) as BinanceTicker[];
      allPrices.forEach(ticker => {
        const symbol = ticker.symbol.replace('USDT', '');
        livePrices.set(symbol, parseFloat(ticker.price));
      });
    }
  } catch (error) {
    console.error("Failed to fetch live prices:", error);
  }
  return livePrices;
}

/**
 * Service to analyze trades and generate notification messages.
 */
function analyzeTrades(trades: Trade[], prices: Map<string, number>) {
  const alerts: { chatId: string, message: string }[] = [];
  const reports: Map<string, string> = new Map();

  for (const trade of trades) {
    const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
    const currentPrice = prices.get(symbol);
    const userChatId = trade.profiles?.telegram_chat_id;
    const userName = trade.profiles?.full_name || 'User';
    
    if (!currentPrice || !userChatId) continue;

    const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction === 'long' ? 1 : -1);
    const liquidationPrice = trade.direction === 'long'
      ? trade.entry_price * (1 - (1 / trade.leverage))
      : trade.entry_price * (1 + (1 / trade.leverage));
    const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / liquidationPrice) * 100;

    // Check for urgent alerts
    if (trade.profiles?.profit_alert_percent && pnlPercentage >= trade.profiles.profit_alert_percent) {
      alerts.push({ chatId: userChatId, message: `✅ Profit Alert for ${trade.crypto_pair}! Current PNL is ${pnlPercentage.toFixed(2)}%` });
    }
    if (distanceToLiquidation < 5) {
      alerts.push({ chatId: userChatId, message: `🚨 Liquidation Warning for ${trade.crypto_pair}! Current price is ${currentPrice}. Liquidation at approx. ${liquidationPrice.toFixed(4)}.` });
    }

    // Build periodic report
    if (!reports.has(userChatId)) {
      reports.set(userChatId, `📊 *Hi ${userName}, Your 5-Minute Open Positions Report:*\n\n`);
    }
    const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
    let reportEntry = reports.get(userChatId) || "";
    reportEntry += `🔹 *${trade.crypto_pair}* (${trade.direction})\n`;
    reportEntry += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}%\n`;
    reportEntry += `   - Current: \`${currentPrice.toFixed(4)}\`\n\n`;
    reports.set(userChatId, reportEntry);
  }
  return { alerts, reports };
}

// ==================================================================
// --- 2. Main Handler (تابع اصلی ارکستر) ---
// ==================================================================

export const handler = async () => {
  console.log("Function starting...");

  try {
    // Step 1: Send startup message to admin
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `✅ Bot check started at ${new Date().toLocaleTimeString()}`);
    }

    // Step 2: Fetch necessary data
    const openTrades = await getOpenTrades(supabase);
    if (openTrades.length === 0) {
      console.log("No open trades.");
      return { statusCode: 200, body: "No open trades." };
    }
    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    const livePrices = await getLivePrices(symbols);

    // Step 3: Analyze data to get alerts and reports
    const { alerts, reports } = analyzeTrades(openTrades, livePrices);

    // Step 4: Send all notifications
    const notificationPromises: Promise<void>[] = [];
    
    // Send urgent alerts
    for (const alert of alerts) {
      notificationPromises.push(sendTelegramNotification(alert.chatId, alert.message));
    }
    
    // Send periodic reports
    for (const [chatId, report] of reports.entries()) {
      notificationPromises.push(sendTelegramNotification(chatId, report, true));
    }
    
    await Promise.all(notificationPromises);

    console.log("Function finished successfully.");
    return { statusCode: 200, body: "Notifications sent." };

  } catch (error: any) {
    console.error("Function failed:", error);
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `❌ Bot Error: ${error.message}`);
    }
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};