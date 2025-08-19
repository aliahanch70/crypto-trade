import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Trade = {
  id: string
  user_id: string
  date_time: string
  crypto_pair: string
  direction: 'long' | 'short'
  position_size: number
  entry_price: number
  exit_price?: number
  stop_loss?: number
  take_profit?: number
  leverage?: number
  pnl?: number
  notes?: string
  status: 'open' | 'closed'
  created_at: string,
  strategy?: string
  market_conditions?: string
  news_and_fundamentals?: string
  emotions?: string
  plan_adherence?: string
  mistakes?: string
}