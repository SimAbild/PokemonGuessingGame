// ui.js — al DOM manipulation samlet ét sted. Ingen anden fil rører DOM.

// ── Screen management ────────────────────────────────────────────────────────

export function showStartScreen() {
  setScreenVisible("screen-start");
}

export function showMatchmakingScreen() {
  setScreenVisible("screen-matchmaking");
  getElement("matchmaking-seconds").textContent = "0";
}

export function showBattleScreen(isMyTurn) {
  setScreenVisible("screen-battle");
  clearGuessList();
  setTurnIndicator(isMyTurn);
}

export function showResultScreen(battle, playerId, guesses) {
  setScreenVisible("screen-result");

  const didWin = battle.winner === playerId;
  const wasDisconnect = battle.status === "cancelled";

  getElement("result-headline").textContent = wasDisconnect
    ? "OPPONENT LEFT"
    : didWin ? "YOU WIN!" : "YOU LOSE";
  getElement("result-headline").className = wasDisconnect
    ? "result-disconnect"
    : didWin ? "result-win" : "result-lose";

  renderAllGuesses(guesses);
}

// ── Matchmaking UI ───────────────────────────────────────────────────────────

export function updateMatchmakingTimer(seconds) {
  getElement("matchmaking-seconds").textContent = String(seconds);
}

export function showMatchmakingTimeout() {
  setScreenVisible("screen-timeout");
}

// ── Battle UI ────────────────────────────────────────────────────────────────

export function setTurnIndicator(isMyTurn) {
  getElement("turn-label").textContent = isMyTurn ? "YOUR TURN" : "ENEMY TURN";
  getElement("guess-input").disabled = !isMyTurn;
  getElement("guess-submit").disabled = !isMyTurn;
  if (isMyTurn) {
    getElement("guess-input").focus();
  }
}

export function updateTimerDisplay(secondsRemaining) {
  const timerEl = getElement("timer-value");
  timerEl.textContent = String(secondsRemaining);
  timerEl.classList.toggle("timer-urgent", secondsRemaining <= 10);
}

export function flashGuessInput(outcome) {
  const input = getElement("guess-input");
  input.classList.remove("input-correct", "input-wrong");
  input.classList.add(outcome === "correct" ? "input-correct" : "input-wrong");
  input.value = "";

  setTimeout(() => {
    input.classList.remove("input-correct", "input-wrong");
  }, 600);
}

export function renderGuess(pokemon, playerId) {
  const listEl = getElement("guess-list");
  const item = buildGuessListItem(pokemon);
  listEl.prepend(item);
}

function buildGuessListItem(pokemon) {
  const li = document.createElement("li");
  li.className = "guess-item";
  li.innerHTML = `
    <img src="${pokemon.sprite_url}" alt="${pokemon.name}" class="guess-sprite" />
    <span class="guess-name">${pokemon.name}</span>
    <span class="guess-id">#${String(pokemon.id).padStart(3, "0")}</span>
  `;
  return li;
}

function renderAllGuesses(guesses) {
  const listEl = getElement("result-guess-list");
  listEl.innerHTML = "";
  guesses.forEach((guess) => {
    const li = buildGuessListItem(guess.pokemon);
    listEl.appendChild(li);
  });
}

function clearGuessList() {
  getElement("guess-list").innerHTML = "";
}

// ── Typing indicator ─────────────────────────────────────────────────────────

export function showTypingIndicator() {
  getElement("typing-indicator").style.display = "block";
}

export function hideTypingIndicator() {
  getElement("typing-indicator").style.display = "none";
}

// ── Reconnect overlay ────────────────────────────────────────────────────────

export function showReconnectingOverlay() {
  getElement("reconnect-overlay").style.display = "flex";
}

export function hideReconnectingOverlay() {
  getElement("reconnect-overlay").style.display = "none";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function setScreenVisible(screenId) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.style.display = "none";
  });
  getElement(screenId).style.display = "flex";
}

function getElement(id) {
  return document.getElementById(id);
}
