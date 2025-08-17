/*
  # Create trades table for crypto trading journal

  1. New Tables
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date_time` (timestamptz)
      - `crypto_pair` (text)
      - `direction` (text, 'long' or 'short')
      - `position_size` (decimal)
      - `entry_price` (decimal)
      - `exit_price` (decimal, nullable)
      - `stop_loss` (decimal, nullable)
      - `take_profit` (decimal, nullable)
      - `pnl` (decimal, nullable)
      - `notes` (text, nullable)
      - `status` (text, default 'open')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `trades` table
    - Add policy for authenticated users to manage their own trades
*/

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_time timestamptz NOT NULL DEFAULT now(),
  crypto_pair text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long', 'short')),
  position_size decimal(20,8) NOT NULL,
  entry_price decimal(20,8) NOT NULL,
  exit_price decimal(20,8),
  stop_loss decimal(20,8),
  take_profit decimal(20,8),
  pnl decimal(20,8),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trades"
  ON trades
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);