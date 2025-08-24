import { createClient } from '@supabase/supabase-js';

// --- Environment Variables & Clients ---
const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
} = process.env;

const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

/**
 * DEBUGGING FUNCTION
 */
export const handler = async () => {
  console.log("--- DEBUG MODE ACTIVATED ---");

  try {
    // تست ۱: آیا اصلاً می‌توانیم به جدول trades دسترسی پیدا کنیم؟
    // (بدون هیچ فیلتری)
    console.log("\n[TEST 1] Fetching first 5 trades from 'trades' table WITHOUT any filters...");
    const { data: allTrades, error: allTradesError } = await supabase
      .from('trades')
      .select('*')
      .limit(5);
      
    console.log("--> Result for Test 1 (All Trades):", JSON.stringify(allTrades, null, 2));
    if (allTradesError) {
      console.error("--> Error in Test 1:", allTradesError.message);
    }

    // تست ۲: آیا فیلتر کردن بر اساس status='open' کار می‌کند؟
    // (بدون join کردن با profiles)
    console.log("\n[TEST 2] Fetching trades filtered by status='open' (NO JOIN)...");
    const { data: openOnlyTrades, error: openOnlyError } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'open');

    console.log("--> Result for Test 2 (Open Trades Only):", JSON.stringify(openOnlyTrades, null, 2));
    if (openOnlyError) {
      console.error("--> Error in Test 2:", openOnlyError.message);
    }

    // تست ۳: آیا کوئری اصلی ما که با profiles جوین می‌شود، کار می‌کند؟
    console.log("\n[TEST 3] Fetching open trades WITH profile join (the original query)...");
    const { data: joinedTrades, error: joinedError } = await supabase
      .from('trades')
      .select('*, profiles (*)')
      .eq('status', 'open');

    console.log("--> Result for Test 3 (Joined Open Trades):", JSON.stringify(joinedTrades, null, 2));
    if (joinedError) {
      console.error("--> Error in Test 3:", joinedError.message);
    }

    console.log("\n--- DEBUG MODE FINISHED ---");
    return { statusCode: 200, body: "Debug check complete. See function logs." };

  } catch (error: any) {
    console.error("A critical error occurred in the handler:", error);
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};