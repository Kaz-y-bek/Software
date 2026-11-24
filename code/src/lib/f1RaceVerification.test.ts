// Verification test for F1 — stale explanation race condition.
// Reproduces handleExplain's state machine WITHOUT rendering React, using
// vitest fake timers to deterministically prove that an older setTimeout
// callback can overwrite a newer availability result.
//
// No production code is changed. No new dependencies are installed.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkAvailability,
  classifyReason,
  formatTime,
} from "@/lib/availability";
import { explainAvailability } from "@/lib/explainAvailability";
import { ROOM, SIMULATED_NOW, EXISTING_BOOKINGS } from "@/lib/demoData";

// Minimal stand-in for the App component's state, mirroring handleExplain /
// handleCheck / handleReset exactly (src/App.tsx lines 34-118).
interface AppState {
  result: { available: boolean; message: string } | null;
  explanation: { explanation: string; degraded: boolean } | null;
  explaining: boolean;
  lastCheckInput: { start: number; end: number } | null;
  blocked: boolean;
  pendingTimer: ReturnType<typeof setTimeout> | null;
}

function makeState(): AppState {
  return {
    result: null,
    explanation: null,
    explaining: false,
    lastCheckInput: null,
    blocked: false,
    pendingTimer: null,
  };
}

// Mirror of handleCheck (no malformed-input branch needed for this test).
function handleCheck(state: AppState, start: number, end: number) {
  const res = checkAvailability({
    roomId: ROOM.id,
    start,
    end,
    now: SIMULATED_NOW,
    blocked: state.blocked,
    bookings: EXISTING_BOOKINGS,
  });
  state.result = res;
  state.lastCheckInput = { start, end };
  state.explanation = null;
}

// Mirror of handleExplain, but tracking the pending timer so a later Check
// could (in a fixed version) clear it. The CURRENT production code does NOT
// track or clear it — this test deliberately mirrors that behaviour.
function handleExplain(state: AppState) {
  if (!state.result || !state.lastCheckInput) return;
  const last = state.lastCheckInput;
  const snapshotResult = state.result;
  state.explaining = true;
  state.pendingTimer = setTimeout(() => {
    const reasonCode = classifyReason({
      roomId: ROOM.id,
      start: last.start,
      end: last.end,
      now: SIMULATED_NOW,
      blocked: state.blocked,
      bookings: EXISTING_BOOKINGS,
    });
    const out = explainAvailability({
      roomLabel: ROOM.id,
      startLabel: formatTime(last.start),
      endLabel: formatTime(last.end),
      isAvailable: snapshotResult.available,
      reasonCode,
    });
    state.explanation = out;
    state.explaining = false;
  }, 300);
}

describe("F1 verification — stale explanation race", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a pending Explain timer can re-insert an explanation after Check cleared it", () => {
    const state = makeState();

    // 1) First check: available 11:00-12:00.
    handleCheck(state, 660, 720);
    expect(state.result?.available).toBe(true);

    // 2) Request an explanation. Timer is scheduled but not fired.
    handleExplain(state);
    expect(state.explaining).toBe(true);
    expect(state.explanation).toBeNull();

    // 3) Before 300ms elapses, user changes inputs and runs Check again.
    //    handleCheck clears `explanation` (already null) and updates `result`.
    handleCheck(state, 630, 690); // overlaps 10:00-11:00 -> unavailable
    expect(state.result?.available).toBe(false);
    expect(state.explanation).toBeNull();

    // 4) Advance time so the FIRST Explain timer fires.
    vi.advanceTimersByTime(300);

    // The stale timer fires with the snapshot of the FIRST (available) result.
    // It overwrites the current (unavailable) state with an "available" wording.
    expect(state.explanation).not.toBeNull();
    expect(state.explanation?.degraded).toBe(false);
    expect(state.explanation?.explanation).toContain("is free from 11:00 to 12:00");

    // The authoritative result is still "unavailable", but the on-screen
    // explanation now claims the room is free — a visible contradiction.
    expect(state.result?.available).toBe(false);
    expect(state.explanation?.explanation).not.toContain("overlaps");
  });

  it("the older timer can overwrite the newer timer's correct explanation", () => {
    const state = makeState();

    // Schedule an "available" explanation that resolves slowly (400ms).
    handleCheck(state, 660, 720); // available
    handleExplain(state); // timer #1, 300ms

    // Immediately run a second check (unavailable) and a second explain that
    // resolves FASTER (100ms) — so the newer, correct explanation renders first.
    handleCheck(state, 630, 690); // unavailable
    // Manually schedule a faster timer to model jitter where the newer call
    // resolves before the older one. The production code has no guard against
    // this ordering.
    state.explaining = true;
    setTimeout(() => {
      state.explanation = {
        explanation: "Room A-101 already has a booking that overlaps 10:30–11:30. Choose a different start or end time to avoid the clash.",
        degraded: false,
      };
      state.explaining = false;
    }, 100);

    // Advance 100ms: newer (correct) timer fires first.
    vi.advanceTimersByTime(100);
    expect(state.explanation?.explanation).toContain("overlaps");
    expect(state.result?.available).toBe(false);

    // Advance the remaining 200ms: the OLDER timer fires and overwrites the
    // correct explanation with the stale "available" wording.
    vi.advanceTimersByTime(200);
    expect(state.explanation?.explanation).toContain("is free from 11:00 to 12:00");
    expect(state.result?.available).toBe(false);
  });
});
