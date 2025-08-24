import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile { user_id: string; telegram_chat_id: string; full_name: string; }
interface Trade { user_id: string; crypto_pair: string; direction: string; entry_price: number; leverage: number; }
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
    const { data, error } = await client
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open');

    if (error) {
        console.error("Failed to fetch trades for user ID:", userId, error);
        return [];
    }
    return data || [];
}

async function getLivePrices(symbols: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    if (symbols.length === 0) return prices;
    try {
        const binancePairs = symbols.map(s => `${s}USDT`);
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(binancePairs)}`);
        if (response.ok) {
            const allPrices = (await response.json()) as BinanceTicker[];
            allPrices.forEach(ticker => { const symbol = ticker.symbol.replace('USDT', ''); prices.set(symbol, parseFloat(ticker.price)); });
        }
    } catch (error) { console.error("Failed to fetch live prices:", error); }
    return prices;
}

function buildReport(trades: Trade[], prices: Map<string, number>, userName: string): string {
    let report = `📊 *Hi ${userName}, Your Open Positions Report:*\n\n`;
    if (trades.length === 0) {
        report = `✅ *Hi ${userName}, you currently have no open positions. *`;
    } else {
        for (const trade of trades) {
            const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
            const currentPrice = prices.get(symbol);
            if (!currentPrice) continue;
            const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction.toLowerCase() === 'long' ? 1 : -1);
            const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
            report += `🔹 *${trade.crypto_pair}* (${trade.direction.toUpperCase()})\n`;
            report += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}%\n`;
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
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name') // <- Select user_id
        .eq('telegram_chat_id', chatId)
        .single();
      
      if (profileError || !profile) {
        await sendTelegramMessage(chatId, "Your profile was not found. Please register your Chat ID in the web app first.");
        return { statusCode: 200, body: 'Profile not found' };
      }

      // Use profile.user_id to fetch trades
      const openTrades = await getOpenTradesForUser(supabase, profile.user_id); 
      
      const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
      const livePrices = await getLivePrices(symbols);
      const reportText = buildReport(openTrades, livePrices, profile.full_name);
      
      const newMessageId = await sendTelegramMessage(chatId, reportText, true);

      if (newMessageId) {
        // Update profile using user_id
        await supabase
          .from('profiles')
          .update({ last_report_message_id: newMessageId })
          .eq('user_id', profile.user_id); 
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    console.error("Webhook failed:", error);
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};