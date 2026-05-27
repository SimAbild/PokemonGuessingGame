-- Race-condition safe matchmaking via SELECT FOR UPDATE SKIP LOCKED
-- Run this in Supabase SQL Editor AFTER schema.sql

CREATE OR REPLACE FUNCTION match_players(requesting_player UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  opponent_entry  matchmaking_queue%ROWTYPE;
  own_entry       matchmaking_queue%ROWTYPE;
  new_battle_id   UUID;
  battle_row      battles%ROWTYPE;
BEGIN
  -- Lock og hent en anden 'waiting' spiller (ikke os selv)
  SELECT * INTO opponent_entry
  FROM matchmaking_queue
  WHERE status = 'waiting'
    AND player_id != requesting_player
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Ingen modstander fundet endnu
  IF NOT FOUND THEN
    -- Sørg for vores egen entry eksisterer
    SELECT * INTO own_entry
    FROM matchmaking_queue
    WHERE player_id = requesting_player AND status = 'waiting'
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO matchmaking_queue (player_id, status)
      VALUES (requesting_player, 'waiting');
    END IF;

    RETURN json_build_object('status', 'waiting');
  END IF;

  -- Opret battle atomisk
  INSERT INTO battles (player1_id, player2_id, current_turn, turn_started_at)
  VALUES (requesting_player, opponent_entry.player_id, requesting_player, NOW())
  RETURNING * INTO battle_row;

  -- Markér begge queue entries som matched
  UPDATE matchmaking_queue
  SET status = 'matched'
  WHERE player_id IN (requesting_player, opponent_entry.player_id);

  RETURN json_build_object(
    'status',      'matched',
    'battle_id',   battle_row.id,
    'player1_id',  battle_row.player1_id,
    'player2_id',  battle_row.player2_id
  );
END;
$$;
