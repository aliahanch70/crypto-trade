import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// --- Types ---
interface Profile { id: string; telegram_chat_id: string; full_name: string; last_report_message_id: number | null; profit_alert_percent: number; }
interface Trade { crypto_pair: string; direction: string; entry_price: number; leverage: number; profiles: Profile | null; }
interface BinanceTicker { symbol: string; price: string; }

// --- Environment Variables & Clients ---
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID } = process.env;
const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- Service Functions (Shared Logic) ---
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

async function editTelegramMessage(chatId: string, messageId: number, message: string, useMarkdown = false): Promise<boolean> {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: message, parse_mode: useMarkdown ? 'Markdown' : 'none' }) });
        if (!response.ok) { console.warn(`Failed to edit message ${messageId}:`, await response.json()); return false; }
        return true;
    } catch (error) { console.error("Telegram editMessage failed:", error); return false; }
}

// async function getOpenTradesForUser(client: SupabaseClient, chatId: string): Promise<Trade[]> {
//     const { data, error } = await client.from('trades').select(`*, profiles!inner(*)`).eq('status', 'open').eq('profiles.telegram_chat_id', chatId);
//     if (error) { console.error("Failed to fetch trades for user:", error); return []; }
//     return data || [];
// }

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
        report = `✅ *Hi ${userName}, you currently have no open positions.*`;
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



// (CHANGE 1) - The new, more reliable way to fetch trades
async function getOpenTradesForUser(client: SupabaseClient, userId: string): Promise<Trade[]> {
    // --- (DIAGNOSTIC LOG 1) ---
    console.log(`[DEBUG] Querying trades for user_id: ${userId}`);

    const { data, error } = await client
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open');

    if (error) {
        console.error("--> [DEBUG] Error fetching trades:", error.message);
        return [];
    }
    
    // --- (DIAGNOSTIC LOG 2) ---
    console.log(`--> [DEBUG] Found ${data?.length || 0} open trades for this user.`);
    return data || [];
}


// ==================================================================
// --- Main Handler for Scheduled Function ---
// ==================================================================
export const handler = async () => {
  console.log("Scheduled function starting...");
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*').not('telegram_chat_id', 'is', null);
    if (error || !profiles) {
        console.error("Error fetching profiles:", error);
        return { statusCode: 500, body: "Error fetching profiles" };
    }
    
    // --- (DIAGNOSTIC LOG 3) ---
    console.log(`[DEBUG] Found ${profiles.length} total profiles with a chat_id.`);

    for (const profile of profiles) {
      // --- (DIAGNOSTIC LOG 4) ---
      console.log(`\n--- Processing profile: ${profile.full_name} ---`);
      console.log(`[DEBUG] Profile's user_id from database is: ${profile.user_id}`);

      const openTrades = await getOpenTradesForUser(supabase, profile.user_id);
      
      const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
      const livePrices = await getLivePrices(symbols);
      
      const reportText = buildReport(openTrades, livePrices, profile.full_name);
      const lastMessageId = profile.last_report_message_id;

      if (lastMessageId) {
        const success = await editTelegramMessage(profile.telegram_chat_id, lastMessageId, reportText, true);
        if (!success) {
          const newMessageId = await sendTelegramMessage(profile.telegram_chat_id, reportText, true);
          if (newMessageId) {
            await supabase.from('profiles').update({ last_report_message_id: newMessageId }).eq('user_id', profile.user_id);
          }
        }
      } 
    }

    console.log("Scheduled function finished successfully.");
    return { statusCode: 200, body: "Scheduled checks complete." };
  } catch (error: any) {
    console.error("Scheduled function failed:", error);
    if (TELEGRAM_ADMIN_CHAT_ID) { await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, `❌ Bot Error: ${error.message}`); }
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};

function getOpenTradesForUserByProfileId(supabase: SupabaseClient<any, "public", "public", any, any>, id: any) {
  throw new Error('Function not implemented.');
}
