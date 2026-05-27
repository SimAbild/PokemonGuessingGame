import { supabase, getOrCreatePlayerId } from "./supabaseClient.js";
import { showMatchmakingScreen, updateMatchmakingTimer, showMatchmakingTimeout } from "./ui.js";

const MATCHMAKING_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

let pollingIntervalId = null;
let waitingStartTime = null;
let timeoutId = null;

export async function startMatchmaking(onBattleFound) {
  const playerId = getOrCreatePlayerId();
  waitingStartTime = Date.now();

  showMatchmakingScreen();
  startWaitingTimer();

  try {
    await joinMatchmakingQueue(playerId, onBattleFound);
  } catch (error) {
    console.error("Matchmaking error:", error.message);
    cancelMatchmaking();
  }
}

async function joinMatchmakingQueue(playerId, onBattleFound) {
  const { data, error } = await supabase.functions.invoke("matchmaking", {
    body: { player_id: playerId },
  });

  if (error) throw new Error(error.message);

  if (data.status === "matched") {
    resolveMatchFound(data, onBattleFound);
    return;
  }

  subscribeToQueueUpdates(playerId, onBattleFound);
  scheduleMatchmakingTimeout();
}

function subscribeToQueueUpdates(playerId, onBattleFound) {
  pollingIntervalId = setInterval(async () => {
    try {
      await pollForMatch(playerId, onBattleFound);
    } catch (error) {
      console.error("Poll error:", error.message);
    }
  }, POLL_INTERVAL_MS);
}

async function pollForMatch(playerId, onBattleFound) {
  const battle = await findActiveBattleForPlayer(playerId);
  if (battle) {
    resolveMatchFound({ battle_id: battle.id, ...battle }, onBattleFound);
  }
}

async function findActiveBattleForPlayer(playerId) {
  const { data } = await supabase
    .from("battles")
    .select("*")
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function resolveMatchFound(battleData, onBattleFound) {
  cancelMatchmaking();
  onBattleFound(battleData);
}

function startWaitingTimer() {
  pollingIntervalId = setInterval(() => {
    const secondsWaited = Math.floor((Date.now() - waitingStartTime) / 1000);
    updateMatchmakingTimer(secondsWaited);
  }, 1000);
}

function scheduleMatchmakingTimeout() {
  timeoutId = setTimeout(async () => {
    cancelMatchmaking();
    await markQueueEntryAsTimeout();
    showMatchmakingTimeout();
  }, MATCHMAKING_TIMEOUT_MS);
}

async function markQueueEntryAsTimeout() {
  const playerId = getOrCreatePlayerId();
  await supabase
    .from("matchmaking_queue")
    .update({ status: "timeout" })
    .eq("player_id", playerId)
    .eq("status", "waiting");
}

export function cancelMatchmaking() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}
