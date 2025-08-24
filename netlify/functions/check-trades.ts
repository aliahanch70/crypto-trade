import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Types ---
interface Profile { id: string; user_id:string; telegram_chat_id: string; full_name: string; }
interface Trade { id: string; user_id: string; status: string; crypto_pair: string; }

// --- Environment Variables & Clients ---
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

// ==================================================================
// --- DEBUGGING HANDLER ---
// ==================================================================
export const handler = async () => {
  console.log("--- DIAGNOSTIC MODE ACTIVATED ---");

  try {
    // تست ۱: تمام پروفایل‌هایی که Chat ID دارند را پیدا کن
    console.log("\n[TEST 1] Fetching all profiles with a Telegram Chat ID...");
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,user_id, full_name, telegram_chat_id')
      .not('telegram_chat_id', 'is', null);

    if (profilesError) throw new Error(`Profile Fetch Error: ${profilesError.message}`);
    
    if (!profiles || profiles.length === 0) {
      console.log("--> RESULT: No profiles with a Telegram Chat ID found. Halting.");
      return { statusCode: 200, body: "No profiles found." };
    }

    console.log(`--> RESULT: Found ${profiles.length} profile(s).`);
    console.log(JSON.stringify(profiles, null, 2));

    // تست ۲: برای هر پروفایل پیدا شده، تریدهای مربوط به آن را جستجو کن
    for (const profile of profiles) {
      console.log(`\n[TEST 2] Checking trades for profile: ${profile.full_name} (ID: ${profile.id}) (userID: ${profile.user_id})`);

      // 2a: تمام تریدهای این کاربر را پیدا کن (بدون فیلتر status)
      const { data: allUserTrades, error: allTradesError } = await supabase
        .from('trades')
        .select('id, crypto_pair, status')
        .eq('user_id', profile.id);
      
      if (allTradesError) {
        console.error("--> ERROR fetching all trades for this user:", allTradesError.message);
        continue; // برو سراغ پروفایل بعدی
      }
      console.log(`--> RESULT 2a: Found ${allUserTrades?.length || 0} total trades for this user.`);
      if (allUserTrades && allUserTrades.length > 0) {
          console.log(JSON.stringify(allUserTrades, null, 2));
      }

      // 2b: حالا فقط تریدهای باز این کاربر را پیدا کن
      const { data: openUserTrades, error: openTradesError } = await supabase
        .from('trades')
        .select('id, crypto_pair, status')
        .eq('user_id', profile.user_id)
        .eq('status', 'open');
        
      if (openTradesError) {
        console.error("--> ERROR fetching open trades for this user:", openTradesError.message);
        continue;
      }
      console.log(`--> RESULT 2b: Found ${openUserTrades?.length || 0} trades with status='open' for this user.`);
       if (openUserTrades && openUserTrades.length > 0) {
          console.log(JSON.stringify(openUserTrades, null, 2));
      }
    }

    console.log("\n--- DIAGNOSTIC MODE FINISHED ---");
    return { statusCode: 200, body: "Debug check complete. See function logs." };

  } catch (error: any) {
    console.error("A critical error occurred in the handler:", error);
    return { statusCode: 500, body: `Error: ${error.message}` };
  }
};