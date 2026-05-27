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
    const { player_id } = await req.json();

    if (!player_id) {
      return jsonError("Missing player_id", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const battle = await findOrCreateBattle(supabase, player_id);
    return jsonResponse(battle);
  } catch (error) {
    return jsonError(`Matchmaking failed: ${error.message}`, 500);
  }
});

async function findOrCreateBattle(supabase: any, playerId: string) {
  await insertIntoQueue(supabase, playerId);
  return await matchWaitingPlayers(supabase, playerId);
}

async function insertIntoQueue(supabase: any, playerId: string) {
  await supabase
    .from("matchmaking_queue")
    .upsert({ player_id: playerId, status: "waiting" }, { onConflict: "player_id" });
}

async function matchWaitingPlayers(supabase: any, playerId: string) {
  const { data, error } = await supabase.rpc("match_players", { requesting_player: playerId });

  if (error) throw new Error(error.message);
  return data;
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
