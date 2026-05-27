import { getOrCreatePlayerId } from "./supabaseClient.js";
import { startMatchmaking, cancelMatchmaking } from "./matchmaking.js";
import { initBattle, submitPokemonGuess } from "./battle.js";
import { broadcastTyping } from "./presence.js";
import { showStartScreen } from "./ui.js";

// Initialiser spiller-ID ved første load
getOrCreatePlayerId();

// ── Start Screen ─────────────────────────────────────────────────────────────
document.getElementById("btn-find-battle").addEventListener("click", () => {
  startMatchmaking(handleBattleFound);
});

// ── Matchmaking Screen ────────────────────────────────────────────────────────
document.getElementById("btn-cancel-matchmaking").addEventListener("click", () => {
  cancelMatchmaking();
  showStartScreen();
});

// ── Timeout Screen ────────────────────────────────────────────────────────────
document.getElementById("btn-try-again").addEventListener("click", () => {
  startMatchmaking(handleBattleFound);
});

document.getElementById("btn-timeout-home").addEventListener("click", () => {
  showStartScreen();
});

// ── Battle Screen ─────────────────────────────────────────────────────────────
document.getElementById("guess-submit").addEventListener("click", () => {
  submitGuessFromInput();
});

document.getElementById("guess-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitGuessFromInput();
});

document.getElementById("guess-input").addEventListener("input", (event) => {
  broadcastTyping(event.target.value.length > 0);
});

// ── Result Screen ─────────────────────────────────────────────────────────────
document.getElementById("btn-front-page").addEventListener("click", () => {
  showStartScreen();
});

// ── Handlers ──────────────────────────────────────────────────────────────────
async function handleBattleFound(battleData) {
  try {
    await initBattle(battleData);
  } catch (error) {
    console.error("Failed to init battle:", error.message);
    showStartScreen();
  }
}

function submitGuessFromInput() {
  const input = document.getElementById("guess-input");
  const pokemonName = input.value.trim();
  if (!pokemonName) return;
  broadcastTyping(false);
  submitPokemonGuess(pokemonName);
}
