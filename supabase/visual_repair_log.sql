-- ============================================
-- Visual Repair Logs (Anti-Slop Engine)
-- ============================================
-- Logs the visual feedback loop data needed to prove
-- "Certified Manifold" claims and track Sv metric quality.
--
-- Part of Operation Vanilla Purge (v3.6.3+)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE visual_repair_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_prompt TEXT,
  broken_code TEXT,
  fixed_code TEXT,
  visual_critic_feedback TEXT,
  volumetric_similarity_score FLOAT, -- The "Sv" Metric (Anti-Slop)
  manifold_status BOOLEAN,           -- The Printability Gate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for time-series queries on repair quality
CREATE INDEX IF NOT EXISTS idx_visual_repair_logs_created
  ON visual_repair_logs(created_at DESC);

-- Index for filtering by manifold pass/fail
CREATE INDEX IF NOT EXISTS idx_visual_repair_logs_manifold
  ON visual_repair_logs(manifold_status);

-- RLS: Service role only (internal telemetry, not user-facing)
ALTER TABLE visual_repair_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage visual repair logs" ON visual_repair_logs
  FOR ALL USING (auth.role() = 'service_role');
