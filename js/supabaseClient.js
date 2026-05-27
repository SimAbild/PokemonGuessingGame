import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://thsaqyoeffbvuoovdpmu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoc2FxeW9lZmZidnVvb3ZkcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQwODAsImV4cCI6MjA5NDE1MDA4MH0.h7XkB2nKeiJ-py6CPrlOHjXEHBorWjsQnudU9BBJiBY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Spiller-identitet ────────────────────────────────────────────────────────

export function getOrCreatePlayerId() {
  let playerId = localStorage.getItem("player_id");
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem("player_id", playerId);
  }
  return playerId;
}

// ── Realtime channel med auto-reconnect ─────────────────────────────────────

let activeChannel = null;

export function subscribeToChannel(channelName, onEvent, onReconnect) {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
  }

  activeChannel = supabase.channel(channelName);

  activeChannel
    .on("postgres_changes", { event: "*", schema: "public" }, onEvent)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onReconnect?.("connected");
      }
      if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        onReconnect?.("reconnecting");
        scheduleReconnect(channelName, onEvent, onReconnect);
      }
    });

  return activeChannel;
}

function scheduleReconnect(channelName, onEvent, onReconnect) {
  setTimeout(() => {
    subscribeToChannel(channelName, onEvent, onReconnect);
  }, 2000);
}

export function unsubscribeActiveChannel() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}
