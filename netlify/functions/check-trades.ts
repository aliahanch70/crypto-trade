import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Define the types for better code clarity
interface Profile {
  telegram_chat_id: string;
  profit_alert_percent: number;
  full_name: string;
}

interface Trade {
  id: string;
  user_id: string;
  crypto_pair: string;
  direction: 'long' | 'short';
  entry_price: number;
  position_size: number;
  leverage: number;
  status: 'open' | 'closed';
  profiles: Profile | null; // The joined profile data
}

// Read environment variables from Netlify
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper function to send a notification to a Telegram chat.
 * @param chatId The user's Telegram Chat ID.
 * @param message The message text to send.
 * @param useMarkdown Whether to use Markdown for formatting.
 */
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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`Failed to send message to ${chatId}:`, await response.json());
    } else {
      console.log(`Notification sent to chat ID ${chatId}`);
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}

/**
 * The main Netlify serverless function, scheduled to run periodically.
 */
export const handler = async () => {
  console.log("Function starting...");

  try {
    // 1. Send a personalized startup message to the admin
    if (TELEGRAM_ADMIN_CHAT_ID) {
      let adminName = 'Admin';
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('telegram_chat_id', TELEGRAM_ADMIN_CHAT_ID)
        .single();

      if (adminProfile && adminProfile.full_name) {
        adminName = adminProfile.full_name;
      }
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `✅ Bot connected. Welcome, ${adminName}! Check started...`);
    }

    // 2. Fetch all open trades and their related profiles
    const { data: openTrades, error: tradesError } = await supabase
      .from('trades')
      .select(`*, profiles (telegram_chat_id, profit_alert_percent, full_name)`)
      .eq('status', 'open') as { data: Trade[] | null, error: any };

    if (tradesError) throw tradesError;
    if (!openTrades || openTrades.length === 0) {
      console.log("No open trades to check.");
      return { statusCode: 200, body: "No open trades." };
    }

    // 3. Fetch live prices for all unique symbols
    const symbols = Array.from(new Set(openTrades.map(t => t.crypto_pair.split('/')[0].toUpperCase())));
    const livePrices: { [key: string]: number } = {};
    if (symbols.length > 0) {
      try {
        const binancePairs = symbols.map(s => `${s}USDT`);
        const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(binancePairs)}`);
        if (priceResponse.ok) {
            const allPrices = await priceResponse.json() as Array<{ symbol: string; price: string }>;
            allPrices.forEach((ticker: any) => {
                const symbol = ticker.symbol.replace('USDT', '');
                livePrices[symbol] = parseFloat(ticker.price);
            });
        }
      } catch (e) {
        console.error("Failed to fetch prices from Binance:", e);
      }
    }

    // 4. Process each trade to check for alerts and build reports
    const reportsByUser: { [chatId: string]: { name: string, report: string } } = {};

    for (const trade of openTrades) {
      const symbol = trade.crypto_pair.split('/')[0].toUpperCase();
      const currentPrice = livePrices[symbol];
      const userChatId = trade.profiles?.telegram_chat_id;
      const userName = trade.profiles?.full_name || 'User';

      // Skip if there's no price or the user hasn't set their chat ID
      if (!currentPrice || !userChatId) continue;

      // Calculations
      const pnlPercentage = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.leverage * 100 * (trade.direction === 'long' ? 1 : -1);
      const liquidationPrice = trade.direction === 'long'
        ? trade.entry_price * (1 - (1 / trade.leverage))
        : trade.entry_price * (1 + (1 / trade.leverage));
      const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / liquidationPrice) * 100;

      // --- Logic for immediate, high-priority alerts ---
      let urgentAlertMessage = '';
      if (trade.profiles?.profit_alert_percent && pnlPercentage >= trade.profiles.profit_alert_percent) {
        urgentAlertMessage = `✅ Profit Alert for ${trade.crypto_pair}!\nCurrent PNL is ${pnlPercentage.toFixed(2)}%`;
      }
      if (distanceToLiquidation < 5) { // e.g., less than 5% away from liquidation
        urgentAlertMessage = `🚨 Liquidation Warning for ${trade.crypto_pair}!\nCurrent price is ${currentPrice}. Liquidation at approx. ${liquidationPrice.toFixed(4)}.`;
      }
      if (urgentAlertMessage) {
        await sendTelegramNotification(userChatId, urgentAlertMessage);
        // Optional: Add logic to prevent sending the same alert repeatedly
      }

      // --- Logic for building the periodic 5-minute report ---
      if (!reportsByUser[userChatId]) {
        reportsByUser[userChatId] = {
          name: userName,
          report: `📊 **Hi ${userName}, Your 5-Minute Open Positions Report:**\n\n`
        };
      }
      
      const pnlStatus = pnlPercentage >= 0 ? '🟢' : '🔴';
      reportsByUser[userChatId].report += `🔹 **${trade.crypto_pair}** (${trade.direction})\n`;
      reportsByUser[userChatId].report += `   - PNL: ${pnlStatus} ${pnlPercentage.toFixed(2)}%\n`;
      reportsByUser[userChatId].report += `   - Entry: ${trade.entry_price.toFixed(4)}\n`;
      reportsByUser[userChatId].report += `   - Current: ${currentPrice.toFixed(4)}\n\n`;
    }

    // 5. Send the consolidated reports to each user
    for (const chatId in reportsByUser) {
      await sendTelegramNotification(chatId, reportsByUser[chatId].report, true); // parse_mode: Markdown
    }

    console.log("Function finished successfully.");
    return { statusCode: 200, body: JSON.stringify({ message: "Checks complete." }) };
  
  } catch (error: any) {
    console.error("Function failed:", error);
    if (TELEGRAM_ADMIN_CHAT_ID) {
      await sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, `❌ Bot Error: ${error.message}`);
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};