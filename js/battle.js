import { supabase, getOrCreatePlayerId, subscribeToChannel, unsubscribeActiveChannel } from "./supabaseClient.js";
import { startTurnTimer, stopTimer } from "./timer.js";
import { startPresence, stopPresence } from "./presence.js";
import {
  showBattleScreen,
  showResultScreen,
  renderBattleGuessList,
  flashGuessInput,
  showReconnectingOverlay,
  hideReconnectingOverlay,
  setTurnIndicator,
} from "./ui.js";

let currentBattle = null;

export async function initBattle(battleData) {
  const playerId = getOrCreatePlayerId();
  currentBattle = await fetchFullBattle(battleData.id ?? battleData.battle_id);

  showBattleScreen(isMyTurn(playerId, currentBattle));
  setTurnIndicator(isMyTurn(playerId, currentBattle));
  startTurnTimer(currentBattle.turn_started_at, () => submitTimeout(currentBattle.id, playerId));
  await refreshGuessDisplay(currentBattle.id);

  subscribeToBattleUpdates(currentBattle.id, playerId);
  startPresence(currentBattle.id, playerId, () => handleOpponentDisconnect(currentBattle.id, playerId));
}

async function fetchFullBattle(battleId) {
  const { data, error } = await supabase
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .maybeSingle();
  if (error) throw new Error(`Could not load battle: ${error.message}`);
  if (!data) throw new Error(`Battle not found: ${battleId}`);
  return data;
}

function subscribeToBattleUpdates(battleId, playerId) {
  subscribeToChannel(
    `battle:${battleId}`,
    (payload) => handleBattleEvent(payload, battleId, playerId),
    (connectionStatus) => handleConnectionStatus(connectionStatus, battleId, playerId)
  );
}

async function handleBattleEvent(payload, battleId, playerId) {
  if (payload.table === "battles") {
    await syncBattleState(battleId, playerId);
  }
  if (payload.table === "guesses") {
    await refreshGuessDisplay(battleId);
  }
}

async function syncBattleState(battleId, playerId) {
  const battle = await fetchFullBattle(battleId);
  currentBattle = battle;

  if (battle.status === "finished" || battle.status === "cancelled") {
    endBattle(battle, playerId);
    return;
  }

  const myTurn = isMyTurn(playerId, battle);
  setTurnIndicator(myTurn);
  stopTimer();
  startTurnTimer(battle.turn_started_at, () => submitTimeout(battleId, playerId));
}

async function handleConnectionStatus(status, battleId, playerId) {
  if (status === "reconnecting") {
    showReconnectingOverlay();
  }
  if (status === "connected") {
    hideReconnectingOverlay();
    await syncBattleState(battleId, playerId);
  }
}

export async function submitPokemonGuess(pokemonName) {
  const playerId = getOrCreatePlayerId();

  try {
    const { data, error } = await supabase.functions.invoke("submit-guess", {
      body: {
        battle_id: currentBattle.id,
        player_id: playerId,
        pokemon_name: pokemonName,
      },
    });

    if (error) throw new Error(error.message);
    processGuessResult(data);
  } catch (error) {
    console.error("Guess submission failed:", error.message);
    flashGuessInput("wrong");
  }
}

function processGuessResult(result) {
  if (result.result === "correct") {
    flashGuessInput("correct");
    // Realtime opdaterer guess-listen for begge spillere
  } else {
    flashGuessInput("wrong");
  }
}

async function submitTimeout(battleId, playerId) {
  try {
    await supabase.functions.invoke("submit-guess", {
      body: { battle_id: battleId, player_id: playerId, is_timeout: true },
    });
  } catch (error) {
    console.error("Timeout submission failed:", error.message);
  }
}

async function handleOpponentDisconnect(battleId, playerId) {
  try {
    await supabase
      .from("battles")
      .update({ status: "cancelled" })
      .eq("id", battleId);
  } catch (error) {
    console.error("Could not cancel battle:", error.message);
  }
}

async function endBattle(battle, playerId) {
  stopTimer();
  stopPresence();
  unsubscribeActiveChannel();

  const guesses = await fetchBattleGuesses(battle.id);
  showResultScreen(battle, playerId, guesses);
}

async function refreshGuessDisplay(battleId) {
  const guesses = await fetchBattleGuesses(battleId);
  renderBattleGuessList(guesses);
}

async function fetchBattleGuesses(battleId) {
  const { data } = await supabase
    .from("guesses")
    .select("*, pokemon(*)")
    .eq("battle_id", battleId)
    .order("guessed_at", { ascending: true });
  return data ?? [];
}

function isMyTurn(playerId, battle) {
  return battle.current_turn === playerId;
}
