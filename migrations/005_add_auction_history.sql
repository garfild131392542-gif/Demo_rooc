-- Add auction_history table to store completed auction awards and history
CREATE TABLE IF NOT EXISTS public.auction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  requested_qty integer NOT NULL DEFAULT 0,
  awarded_qty integer NOT NULL DEFAULT 0,
  session_date date NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  awarded_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_history_guild_id ON public.auction_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_auction_history_user_id ON public.auction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_history_session_date ON public.auuction_history(session_date);
