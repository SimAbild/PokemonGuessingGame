import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { battle_id, player_id, pokemon_name, is_timeout } = body;

    if (!battle_id || !player_id) {
      return jsonError("Missing required fields", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (is_timeout) {
      return await handleTimeout(supabase, battle_id, player_id);
    }

    return await handleGuess(supabase, battle_id, player_id, pokemon_name);
  } catch (error) {
    return jsonError(`Submit failed: ${error.message}`, 500);
  }
});

async function handleTimeout(supabase: any, battleId: string, timedOutPlayerId: string) {
  const battle = await fetchActiveBattle(supabase, battleId);
  if (!battle) return jsonError("Battle not found", 404);

  const winnerId = getOpponentId(battle, timedOutPlayerId);

  await supabase
    .from("battles")
    .update({ status: "finished", winner: winnerId })
    .eq("id", battleId);

  return jsonResponse({ result: "timeout", winner: winnerId });
}

async function handleGuess(
  supabase: any,
  battleId: string,
  playerId: string,
  pokemonName: string
) {
  const battle = await fetchActiveBattle(supabase, battleId);
  if (!battle) return jsonError("Battle not found or not active", 404);

  if (battle.current_turn !== playerId) {
    return jsonError("Not your turn", 403);
  }

  const normalizedInput = normalizePokemonName(pokemonName);
  const pokemon = await findPokemonByNormalizedName(supabase, normalizedInput);

  if (!pokemon) {
    return jsonResponse({ result: "wrong", reason: "unknown_pokemon" });
  }

  const alreadyGuessed = await isPokemonAlreadyGuessed(supabase, battleId, pokemon.id);
  if (alreadyGuessed) {
    return jsonResponse({ result: "wrong", reason: "already_guessed" });
  }

  await recordGuess(supabase, battleId, playerId, pokemon.id);
  await advanceTurn(supabase, battle, playerId);

  return jsonResponse({ result: "correct", pokemon });
}

async function fetchActiveBattle(supabase: any, battleId: string) {
  const { data } = await supabase
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .eq("status", "active")
    .single();
  return data;
}

async function findPokemonByNormalizedName(supabase: any, normalizedName: string) {
  const { data } = await supabase
    .from("pokemon")
    .select("*")
    .eq("normalized_name", normalizedName)
    .single();
  return data;
}

async function isPokemonAlreadyGuessed(
  supabase: any,
  battleId: string,
  pokemonId: number
): Promise<boolean> {
  const { data } = await supabase
    .from("guesses")
    .select("id")
    .eq("battle_id", battleId)
    .eq("pokemon_id", pokemonId);
  return data && data.length > 0;
}

async function recordGuess(
  supabase: any,
  battleId: string,
  playerId: string,
  pokemonId: number
) {
  await supabase
    .from("guesses")
    .insert({ battle_id: battleId, player_id: playerId, pokemon_id: pokemonId });
}

async function advanceTurn(supabase: any, battle: any, currentPlayerId: string) {
  const nextPlayerId = getOpponentId(battle, currentPlayerId);
  await supabase
    .from("battles")
    .update({ current_turn: nextPlayerId, turn_started_at: new Date().toISOString() })
    .eq("id", battle.id);
}

function getOpponentId(battle: any, playerId: string): string {
  return battle.player1_id === playerId ? battle.player2_id : battle.player1_id;
}

function normalizePokemonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
