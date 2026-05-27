-- Pokemon Guessing Game — Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pokemon (
  id               INTEGER PRIMARY KEY,
  name             TEXT NOT NULL,
  normalized_name  TEXT NOT NULL,
  sprite_url       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status     TEXT        DEFAULT 'waiting'  -- 'waiting' | 'matched' | 'timeout'
);

CREATE TABLE IF NOT EXISTS battles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id       UUID        NOT NULL,
  player2_id       UUID        NOT NULL,
  current_turn     UUID        NOT NULL,
  turn_started_at  TIMESTAMPTZ NOT NULL,
  status           TEXT        DEFAULT 'active',  -- 'active' | 'finished' | 'cancelled'
  winner           UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guesses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID        REFERENCES battles(id),
  player_id   UUID        NOT NULL,
  pokemon_id  INTEGER     REFERENCES pokemon(id),
  guessed_at  TIMESTAMPTZ DEFAULT NOW()
);
