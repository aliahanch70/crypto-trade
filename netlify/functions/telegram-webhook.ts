import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile { user_id: string; telegram_chat_id: string; full_name: string; last_report_message_id: number | null; }
interface Trade { user_id: string; crypto_pair: string; direction: string; entry_price: number; leverage: number; }
interface CoinListItem { id: string; symbol: string; name: string; }
interface BinanceTicker { symbol: string; price: string; }

// --- Environment Variables & Clients ---
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN } = process.env;
const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- Service Functions ---
// ==================================================================

async function sendTelegramMessage(chatId: string, message: string, useMarkdown = false): Promise<number | null> {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: useMarkdown ? 'Markdown' : 'none' }) });
        if (!response.ok) { console.error(`Failed to send message to ${chatId}:`, await response.json()); return null; }
        const data: any = await response.json();
        return data.result.message_id;
    } catch (error) { console.error("Telegram sendMessage failed:", error); return null; }
}

async function getOpenTradesForUser(client: SupabaseClient, userId: string): Promise<Trade[]> {
    const { data, error } = await client.from('trades').select('*').eq('user_id', userId).eq('status', 'open');
    if (error) { console.error("Failed to fetch trades for user ID:", userId, error); return []; }
    return data || [];
}

// --- (CHANGE 1) - The new smart price fetching service with fallback logic ---

async function fetchFromCoinGecko(symbols: string[], coinList: CoinListItem[]): Promise<Map<string, number>> {
  console.log("Attempting to fetch from CoinGecko...");
  const prices = new Map<string, number>();
  const priorityMap: { [symbol: string]: string } = { 'btc': 'bitcoin', 'eth': 'ethereum', 'bnb': 'binancecoin', 'sol': 'solana', 'xrp': 'ripple', 'ada': 'cardano', 'aave': 'aave' };
  const symbolToIdMap = new Map<string, string>();
  for (const symbol of symbols) {
    const lowerSymbol = symbol.toLowerCase();
    if (priorityMap[lowerSymbol]) {
      symbolToIdMap.set(symbol, priorityMap[lowerSymbol]);
      continue;
    }
    const foundCoin = coinList.find(c => c.symbol.toLowerCase() === lowerSymbol || c.name.toLowerCase() === lowerSymbol || c.id === lowerSymbol);
    if (foundCoin) { symbolToIdMap.set(symbol, foundCoin.id); }
  }
  const idsToFetch = Array.from(new Set(symbolToIdMap.values()));
  if (idsToFetch.length === 0) throw new Error("Could not map any symbols to CoinGecko IDs.");

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch.join(',')}&vs_currencies=usd`);
  if (!response.ok) throw new Error(`CoinGecko request failed with status: ${response.status}`);
  
  const priceData = await response.json() as Record<string, { usd: number }>;
  for (const [symbol, id] of symbolToIdMap.entries()) {
    if (priceData[id]?.usd) { prices.set(symbol.toUpperCase(), priceData[id].usd); }
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
  allPrices.forEach(ticker => { const symbol = ticker.symbol.replace('USDT', ''); prices.set(symbol, parseFloat(ticker.price)); });
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

function buildReport(trades: Trade[], prices: Map<string, number>, userName: string): string {
    let report = `📊 *Hi ${userName}, Your Open Positions Report:*\n\n`;
    if (trades.length === 0) {
        report = `✅ *Hi ${userName}, you currently have no open positions.*`;
    } else {
        for (const trade of trades) {
            const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
            const currentPrice = prices.get(symbol);
            if (!currentPrice) continue;
            const pnlPrice = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * (trade.direction.toLowerCase() === 'long' ? 1 : -1);

            const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction.toLowerCase() === 'long' ? 1 : -1);
            const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
            report += `🔹 *${trade.crypto_pair}* (${trade.direction.toUpperCase()}) X${trade.leverage}\n`;
            report += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}% ${pnlPrice}\n`;
            report += `   - Current Price: \`${currentPrice.toFixed(4)}\`\n\n`;
        }
    }
    report += `\n_Last updated: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} UTC_`;
    return report;
}

// ==================================================================
// --- Main Handler for the Webhook ---
// ==================================================================

export const handler = async (event: { body: string, httpMethod: string }) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const message = body.message;

    if (message && message.text === '/start') {
      const chatId = message.chat.id.toString();
      
      const { data: profile, error: profileError } = await supabase.from('profiles').select('user_id, full_name').eq('telegram_chat_id', chatId).single();
      if (profileError || !profile) {
        await sendTelegramMessage(chatId, "Your profile was not found. Please register your Chat ID in the web app first.");
        return { statusCode: 200, body: 'Profile not found' };
      }

      const openTrades = await getOpenTradesForUser(supabase, profile.user_id); 
      
      // (CHANGE 2) - Fetch the master coin list before getting prices
      const coinListResponse = await fetch('https://api.coingecko.com/api/v3/coins/list');
      const coinList = await coinListResponse.json() as CoinListItem[];
      
      const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
      
      // (CHANGE 3) - Call the new smart orchestrator function
      const livePrices = await getLivePrices(symbols, coinList);
      
      const reportText = buildReport(openTrades, livePrices, profile.full_name);
      const newMessageId = await sendTelegramMessage(chatId, reportText, true);

      if (newMessageId) {
        await supabase.from('profiles').update({ last_report_message_id: newMessageId }).eq('user_id', profile.user_id); 
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    console.error("Webhook failed:", error);
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};