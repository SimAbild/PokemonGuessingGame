-- Pokemon Guessing Game — Row Level Security
-- Run AFTER schema.sql

-- =====================
-- pokemon (read-only for all)
-- =====================
ALTER TABLE pokemon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pokemon_read_all"
  ON pokemon FOR SELECT
  USING (true);

-- =====================
-- matchmaking_queue
-- =====================
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_insert_own"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "queue_select_own"
  ON matchmaking_queue FOR SELECT
  USING (true);

CREATE POLICY "queue_update_service"
  ON matchmaking_queue FOR UPDATE
  USING (true);

-- =====================
-- battles
-- =====================
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Ingen login i dette spil — alle kan læse battles via anon key
CREATE POLICY "battles_select_all"
  ON battles FOR SELECT
  USING (true);

CREATE POLICY "battles_insert_service"
  ON battles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "battles_update_service"
  ON battles FOR UPDATE
  USING (true);

-- =====================
-- guesses
-- =====================
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guesses_insert_own"
  ON guesses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "guesses_select_participant"
  ON guesses FOR SELECT
  USING (true);
