import { updateTimerDisplay } from "./ui.js";

const TURN_DURATION_SECONDS = 30;

let countdownIntervalId = null;

export function startTurnTimer(turnStartedAt, onExpire) {
  stopTimer();

  countdownIntervalId = setInterval(() => {
    const secondsRemaining = calculateSecondsRemaining(turnStartedAt);

    if (secondsRemaining <= 0) {
      stopTimer();
      updateTimerDisplay(0);
      onExpire();
      return;
    }

    updateTimerDisplay(secondsRemaining);
  }, 500);
}

export function stopTimer() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

function calculateSecondsRemaining(turnStartedAt) {
  const elapsedMs = Date.now() - new Date(turnStartedAt).getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  return TURN_DURATION_SECONDS - elapsedSeconds;
}
