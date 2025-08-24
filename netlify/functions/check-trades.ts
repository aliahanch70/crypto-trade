import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile {
  telegram_chat_id: string;
  profit_alert_percent: number;
  full_name: string;
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
const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY, // Or SUPABASE_SERVICE_KEY if you're using it
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID,
} = process.env;

const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- 1. Service Functions ---
// ==================================================================

/**
 * Service to send a notification via Telegram.
 */
async function sendTelegramNotification(chatId: string, message: string, useMarkdown = false) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Telegram Bot Token is not configured.");
    return;
  }
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
 * Price fetching services with fallback logic.
 */
async function fetchFromCoinGecko(symbols: string[], coinList: CoinListItem[]): Promise<Map<string, number>> {
  console.log("Attempting to fetch from CoinGecko...");
  const prices = new Map<string, number>();
  
  const priorityMap: { [symbol: string]: string } = {
    'btc': 'bitcoin', 'eth': 'ethereum', 'bnb': 'binancecoin', 'sol': 'solana', 'xrp': 'ripple', 'ada': 'cardano', 'aave': 'aave'
  };

  const symbolToIdMap = new Map<string, string>();
  for (const symbol of symbols) {
    const lowerSymbol = symbol.toLowerCase();
    if (priorityMap[lowerSymbol]) {
      symbolToIdMap.set(symbol, priorityMap[lowerSymbol]);
      continue;
    }
    const foundCoin = coinList.find(c => c.symbol.toLowerCase() === lowerSymbol || c.name.toLowerCase() === lowerSymbol || c.id === lowerSymbol);
    if (foundCoin) {
      symbolToIdMap.set(symbol, foundCoin.id);
    }
  }

  const idsToFetch = Array.from(new Set(symbolToIdMap.values()));
  if (idsToFetch.length === 0) throw new Error("Could not map any symbols to CoinGecko IDs.");

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(',')}&vs_currencies=usd`);
  if (!response.ok) throw new Error(`CoinGecko request failed with status: ${response.status}`);
  
  const priceData = await response.json() as Record<string, { usd: number }>;
  for (const [symbol, id] of symbolToIdMap.entries()) {
    if (priceData[id]?.usd) {
      prices.set(symbol.toUpperCase(), priceData[id].usd);
    }
  }
  
  if (prices.size === 0) throw new Error("No prices returned from CoinGecko.");
  console.log('Successfully fetched from CoinGecko');
  return prices;
}

async function fetchFromBinance(symbols: string[]): Promise<Map<string, number>> {
  console.log("Attempting to fetch from Binance...");
  const prices = new Map<string, number>();
  const binancePairs = symbols.map(s => `${s}USDT`);
  const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(binancePairs)}`);
  if (!response.ok) throw new Error(`Binance request failed with status: ${response.status}`);
  
  const allPrices = (await response.json()) as BinanceTicker[];
  allPrices.forEach(ticker => {
    const symbol = ticker.symbol.replace('USDT', '');
    prices.set(symbol, parseFloat(ticker.price));
  });

  if (prices.size === 0) throw new Error("No prices returned from Binance.");
  console.log('Successfully fetched from Binance');
  return prices;
}

async function getLivePrices(symbols: string[], coinList: CoinListItem[]): Promise<Map<string, number>> {
  try {
    return await fetchFromCoinGecko(symbols, coinList);
  } catch (error) {
    console.warn("CoinGecko failed:", error, "Falling back to Binance.");
    try {
      return await fetchFromBinance(symbols);
    } catch (fallbackError) {
      console.error("All price providers failed (CoinGecko, Binance):", fallbackError);
      return new Map();
    }
  }
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

    if (trade.profiles?.profit_alert_percent && pnlPercentage >= trade.profiles.profit_alert_percent) {
      alerts.push({ chatId: userChatId, message: `✅ Profit Alert for ${trade.crypto_pair}!\nCurrent PNL is ${pnlPercentage.toFixed(2)}%` });
    }
    if (distanceToLiquidation < 5) {
      alerts.push({ chatId: userChatId, message: `🚨 Liquidation Warning for ${trade.crypto_pair}!\nCurrent price is ${currentPrice}. Liquidation at approx. ${liquidationPrice.toFixed(4)}.` });
    }

    if (!reports.has(userChatId)) {
      reports.set(userChatId, `📊 *Hi ${userName}, Your 5-Minute Open Positions Report:*\n\n`);
    }
    const pnlStatus = pnlPercentage <= 0 ? '🟢' : '🔴';
    let reportEntry = reports.get(userChatId) || "";
    reportEntry += `🔹 *${trade.crypto_pair}* (${trade.direction})\n`;
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
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `✅ Bot check started at ${new Date().toLocaleTimeString()}`);
    }

    const openTrades = await getOpenTrades(supabase);
    if (openTrades.length === 0) {
      console.log("No open trades found this run.");
      return { statusCode: 200, body: "No open trades." };
    }
    
    // Fetch the master coin list for mapping symbols to IDs
    const coinListResponse = await fetch('https://api.coingecko.com/api/v3/coins/list');
    const coinList = await coinListResponse.json() as CoinListItem[];

    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    const livePrices = await getLivePrices(symbols, coinList);

    if (livePrices.size === 0) {
        console.warn("Could not fetch any live prices. Skipping analysis.");
        return { statusCode: 200, body: "Could not fetch prices." };
    }

    const { alerts, reports } = analyzeTrades(openTrades, livePrices);
    
    const notificationPromises: Promise<void>[] = [];
    for (const alert of alerts) {
      notificationPromises.push(sendTelegramNotification(alert.chatId, alert.message));
    }
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