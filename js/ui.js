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

export function showResultScreen(battle, playerId, guesses, allPokemon) {
  setScreenVisible("screen-result");

  const didWin = battle.winner === playerId;
  const wasDisconnect = battle.status === "cancelled";

  getElement("result-headline").textContent = wasDisconnect
    ? "OPPONENT LEFT"
    : didWin ? "YOU WIN!" : "YOU LOSE";
  getElement("result-headline").className = wasDisconnect
    ? "result-disconnect"
    : didWin ? "result-win" : "result-lose";

  getElement("result-summary").textContent = `${guesses.length}/151 POKEMON GUESSED`;

  renderResultPokedexTable(allPokemon, guesses);
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

export function renderBattleGuessList(guesses) {
  const listEl = getElement("guess-list");
  listEl.innerHTML = "";
  guesses.forEach((guess) => {
    if (guess.pokemon) {
      listEl.appendChild(buildGuessListItem(guess.pokemon));
    }
  });
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

function renderResultPokedexTable(allPokemon, guesses) {
  const guessedIds = new Set(guesses.map((g) => g.pokemon_id));
  const container = getElement("result-pokedex");
  container.innerHTML = "";

  const columns = 4;
  const perColumn = Math.ceil(allPokemon.length / columns);

  for (let col = 0; col < columns; col++) {
    const slice = allPokemon.slice(col * perColumn, (col + 1) * perColumn);
    const table = buildPokedexColumn(slice, guessedIds);
    container.appendChild(table);
  }
}

function buildPokedexColumn(pokemonSlice, guessedIds) {
  const table = document.createElement("table");
  table.className = "result-table";

  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Dex</th><th>Pokémon</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  pokemonSlice.forEach((pokemon) => {
    const tr = document.createElement("tr");
    const wasGuessed = guessedIds.has(pokemon.id);
    tr.className = wasGuessed ? "result-row-guessed" : "result-row-empty";
    tr.innerHTML = `
      <td>${String(pokemon.id).padStart(3, "0")}</td>
      <td>${wasGuessed ? pokemon.name : ""}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

export function updateGuessCounter(count) {
  getElement("guess-counter").textContent = `${count}/151`;
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
