import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile {
  id: string; // User ID
  telegram_chat_id: string;
  profit_alert_percent: number;
  full_name: string;
  last_report_message_id: number | null;
}
interface Trade {
  id: string;
  crypto_pair: string;
  direction: string;
  entry_price: number;
  position_size: number;
  leverage: number;
  profiles: Profile | null;
}
interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}
interface BinanceTicker {
  symbol: string;
  price: string;
}

// --- Environment Variables & Clients ---
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID } = process.env;
const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- 1. Service Functions ---
// ==================================================================

/**
 * Sends a new message and returns its message_id.
 */
async function sendTelegramMessage(chatId: string, message: string, useMarkdown = false): Promise<number | null> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: useMarkdown ? 'Markdown' : 'none' }),
    });
    if (!response.ok) {
      console.error(`Failed to send message to ${chatId}:`, await response.json());
      return null;
    }
    const data: any = await response.json();
    return data.result.message_id;
  } catch (error) {
    console.error("Telegram sendMessage failed:", error);
    return null;
  }
}

/**
 * Edits an existing message and returns its message_id.
 */
async function editTelegramMessage(chatId: string, messageId: number, message: string, useMarkdown = false): Promise<number | null> {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: message, parse_mode: useMarkdown ? 'Markdown' : 'none' }),
        });
        if (!response.ok) {
            console.warn(`Failed to edit message ${messageId}:`, await response.json());
            return null;
        }
        const data: any = await response.json();
        return data.result.message_id;
    } catch (error) {
        console.error("Telegram editMessage failed:", error);
        return null;
    }
}

/**
 * Fetches all open trades from the database.
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
 * Fetches live prices using a fallback mechanism.
 */
async function getLivePrices(symbols: string[], coinList: CoinListItem[]): Promise<Map<string, number>> {
  // ... The full implementation of this function
  // For brevity, assuming a simple fetch, but the multi-provider logic can be here.
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
  } catch(error) {
      console.error("Failed to fetch prices:", error)
  }
  return livePrices;
}

/**
 * Analyzes trades and generates notification messages.
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

    const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction.toLowerCase() === 'long' ? 1 : -1);
    const liquidationPrice = trade.direction.toLowerCase() === 'long'
      ? trade.entry_price * (1 - (1 / trade.leverage))
      : trade.entry_price * (1 + (1 / trade.leverage));
    const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / liquidationPrice) * 100;

    if (trade.profiles?.profit_alert_percent && pnlPercentage >= trade.profiles.profit_alert_percent) {
      alerts.push({ chatId: userChatId, message: `✅ Profit Alert for ${trade.crypto_pair}!\nCurrent PNL is ${pnlPercentage.toFixed(2)}%` });
    }
    if (distanceToLiquidation < 5) {
      alerts.push({ chatId: userChatId, message: `🚨 Liquidation Warning for ${trade.crypto_pair}!\nCurrent price is ${currentPrice}.` });
    }

    if (!reports.has(userChatId)) {
      reports.set(userChatId, `📊 *Hi ${userName}, Your 5-Minute Report:*\n\n`);
    }
    const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
    let reportEntry = reports.get(userChatId) || "";
    reportEntry += `🔹 *${trade.crypto_pair}* (${trade.direction.toUpperCase()})\n`;
    reportEntry += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}%\n`;
    reportEntry += `   - Current Price: \`${currentPrice.toFixed(4)}\`\n\n`;
    reports.set(userChatId, reportEntry);
  }
  return { alerts, reports };
}

// ==================================================================
// --- 2. Main Handler ---
// ==================================================================

export const handler = async () => {
  console.log("Function starting...");
  try {
    const openTrades = await getOpenTrades(supabase);
    if (!openTrades || openTrades.length === 0) {
      console.log("No open trades to check.");
      return { statusCode: 200, body: "No open trades." };
    }
    
    const coinListResponse = await fetch('https://api.coingecko.com/api/v3/coins/list');
    const coinList = await coinListResponse.json() as CoinListItem[];

    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    const livePrices = await getLivePrices(symbols, coinList);

    const { alerts, reports } = analyzeTrades(openTrades, livePrices);
    
    // Send urgent alerts as new messages
    for (const alert of alerts) {
      await sendTelegramMessage(alert.chatId, alert.message);
    }
    
    const userProfilesToUpdate: Map<string, { userId: string, messageId: number }> = new Map();

    for (const [chatId, report] of reports.entries()) {
      const trade = openTrades.find(t => t.profiles?.telegram_chat_id === chatId);
      const lastMessageId = trade?.profiles?.last_report_message_id;
      const userId = trade?.profiles?.id;

      let newMessageId: number | null = null;
      if (lastMessageId) {
        newMessageId = await editTelegramMessage(chatId, lastMessageId, report, true);
      }
      
      // If editing failed or there was no previous message, send a new one
      if (!newMessageId && userId) {
        newMessageId = await sendTelegramMessage(chatId, report, true);
        if (newMessageId) {
          userProfilesToUpdate.set(chatId, { userId, messageId: newMessageId });
        }
      }
    }
    
    // Update the database with the new message IDs for users who received a new message
    if (userProfilesToUpdate.size > 0) {
        const updates = Array.from(userProfilesToUpdate.values()).map(({userId, messageId}) => 
            supabase.from('profiles').update({ last_report_message_id: messageId }).eq('id', userId)
        );
        await Promise.all(updates);
        console.log("Updated last_report_message_id for users.");
    }

    console.log("Function finished successfully.");
    return { statusCode: 200, body: "Notifications sent." };

  } catch (error: any) {
    console.error("Function failed:", error);
    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, `❌ Bot Error: ${error.message}`);
    }
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};