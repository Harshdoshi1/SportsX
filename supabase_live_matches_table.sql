-- Create live_matches table for admin-added matches
CREATE TABLE IF NOT EXISTS admin_tracked_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'upcoming')),
  tournament_id TEXT DEFAULT 'admin',
  series TEXT,
  sport TEXT DEFAULT 'cricket',
  category TEXT,
  section_label TEXT,
  match_title TEXT,
  team1 TEXT,
  team2 TEXT,
  status TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_tracked_matches_active ON admin_tracked_matches(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_tracked_matches_mode ON admin_tracked_matches(mode);
CREATE INDEX IF NOT EXISTS idx_admin_tracked_matches_url ON admin_tracked_matches(source_url);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_tracked_matches_updated_at
  BEFORE UPDATE ON admin_tracked_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE admin_tracked_matches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth setup)
CREATE POLICY "Allow all operations on admin_tracked_matches"
  ON admin_tracked_matches
  FOR ALL
  USING (true)
  WITH CHECK (true);
