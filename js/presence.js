import { supabase, getOrCreatePlayerId } from "./supabaseClient.js";
import { showTypingIndicator, hideTypingIndicator } from "./ui.js";

const HEARTBEAT_INTERVAL_MS = 10_000;
const DISCONNECT_THRESHOLD_MS = 15_000;

let presenceChannel = null;
let heartbeatIntervalId = null;
let opponentLastSeenAt = null;
let disconnectCheckIntervalId = null;

export function startPresence(battleId, playerId, onOpponentDisconnect) {
  presenceChannel = supabase.channel(`presence:${battleId}`, {
    config: { presence: { key: playerId } },
  });

  presenceChannel
    .on("presence", { event: "sync" }, () => {
      handlePresenceSync(playerId, onOpponentDisconnect);
    })
    .on("presence", { event: "join" }, ({ key }) => {
      if (key !== playerId) opponentLastSeenAt = Date.now();
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      if (key !== playerId) checkOpponentStillAlive(onOpponentDisconnect);
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.player_id !== playerId) {
        handleTypingBroadcast(payload.is_typing);
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackHeartbeat(playerId);
        startHeartbeatLoop(playerId);
        startDisconnectMonitor(onOpponentDisconnect);
      }
    });
}

async function trackHeartbeat(playerId) {
  try {
    await presenceChannel.track({ player_id: playerId, online_at: Date.now() });
  } catch (error) {
    console.error("Heartbeat track failed:", error.message);
  }
}

function startHeartbeatLoop(playerId) {
  heartbeatIntervalId = setInterval(() => {
    trackHeartbeat(playerId);
  }, HEARTBEAT_INTERVAL_MS);
}

function startDisconnectMonitor(onOpponentDisconnect) {
  opponentLastSeenAt = Date.now();
  disconnectCheckIntervalId = setInterval(() => {
    checkOpponentStillAlive(onOpponentDisconnect);
  }, 5_000);
}

function handlePresenceSync(playerId, onOpponentDisconnect) {
  const presenceState = presenceChannel.presenceState();
  const opponentIsPresent = Object.keys(presenceState).some((key) => key !== playerId);

  if (opponentIsPresent) {
    opponentLastSeenAt = Date.now();
  } else {
    checkOpponentStillAlive(onOpponentDisconnect);
  }
}

function checkOpponentStillAlive(onOpponentDisconnect) {
  if (!opponentLastSeenAt) return;
  const silenceDuration = Date.now() - opponentLastSeenAt;
  if (silenceDuration >= DISCONNECT_THRESHOLD_MS) {
    onOpponentDisconnect();
  }
}

function handleTypingBroadcast(isTyping) {
  if (isTyping) {
    showTypingIndicator();
  } else {
    hideTypingIndicator();
  }
}

export function broadcastTyping(isTyping) {
  if (!presenceChannel) return;
  const playerId = getOrCreatePlayerId();
  presenceChannel.send({
    type: "broadcast",
    event: "typing",
    payload: { player_id: playerId, is_typing: isTyping },
  });
}

export function stopPresence() {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  if (disconnectCheckIntervalId) {
    clearInterval(disconnectCheckIntervalId);
    disconnectCheckIntervalId = null;
  }
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
}
