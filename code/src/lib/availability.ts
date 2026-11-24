// ── Smart Campus Room Availability Checker ──────────────────────────────────
// Pure availability-checking logic. No side effects, no mutation of inputs.
// All times are integer minutes after midnight (0 = 00:00, 1440 = 24:00).

export const DAY_END_MINUTES = 1440;
export const MAX_BOOKING_MINUTES = 120;

export interface Booking {
  start: number; // minutes after midnight
  end: number;   // minutes after midnight
}

export interface AvailabilityInput {
  roomId: string;
  start: number;
  end: number;
  now: number;       // simulated current time in minutes
  blocked: boolean;  // is the room blocked?
  bookings: Booking[]; // existing bookings (read-only)
}

export interface DurationInput {
  roomId: string;
  start: number;   // minutes after midnight
  duration: number; // whole minutes; end time is derived as start + duration
  now: number;
  blocked: boolean;
  bookings: Booking[];
}

export interface AvailabilityResult {
  available: boolean;
  message: string;
}

export type AvailabilityReasonCode =
  | "available"
  | "invalid-time"
  | "past-request"
  | "too-long"
  | "blocked"
  | "overlapping";

/** Structured decision: boolean outcome, coarse reason code, human-readable message. */
export interface Decision extends AvailabilityResult {
  reason: AvailabilityReasonCode;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert integer minutes after midnight to a "HH:MM" string. */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Parse a time string in "HH:MM" format into integer minutes after midnight.
 * Accepts "09:00", "9:00", "24:00" (end-of-day). Returns null when malformed.
 */
export function parseTime(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const mins = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(mins)) return null;
  if (hours < 0 || mins < 0) return null;
  if (mins > 59) return null;
  if (hours > 24) return null;
  if (hours === 24 && mins !== 0) return null;

  return hours * 60 + mins;
}

/**
 * Parse a duration string of whole minutes ("30", "60", "90").
 * Accepts non-negative integers up to 4 digits (so 0 is parseable and can be
 * rejected by the AC2 rule with clear feedback). Returns null when malformed.
 */
export function parseDuration(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

// ── Shared rule predicates (also used by the UI for live feedback) ───────────

/** AC1: a start time must be strictly after the current time. */
export function isStartAfterNow(start: number, now: number): boolean {
  return start > now;
}

/** AC2: a duration must be positive and no longer than the maximum booking. */
export function isDurationAllowed(duration: number): boolean {
  return duration > 0 && duration <= MAX_BOOKING_MINUTES;
}

// ── Single shared decision core ──────────────────────────────────────────────
// Both the UI and the mock explainer consume this one evaluation, so the rule
// order and reason codes can never drift apart.

/**
 * Evaluate one request against the booking rules. Read-only: never mutates
 * `bookings` or any other input, and never creates a booking.
 *
 * Rule order:
 *   AC6/AC1  time validation (integers, 0 <= start < end <= DAY_END_MINUTES, start > now)
 *   AC2      duration 1..MAX_BOOKING_MINUTES
 *   AC3      overlap detection (touching endpoints allowed)
 *   AC4      blocked room → always unavailable
 *   AC5      available decision, fixtures untouched
 */
function decide(input: {
  roomId: string;
  start: number;
  end: number;
  now: number;
  blocked: boolean;
  bookings: Booking[];
}): Decision {
  const { roomId, start, end, now, blocked, bookings } = input;

  // Time validation — whole minutes
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return {
      available: false,
      reason: "invalid-time",
      message: "Start and end times must be whole minutes.",
    };
  }

  // Time validation — range: 0 <= start, end <= DAY_END_MINUTES
  if (start < 0 || end > DAY_END_MINUTES) {
    return {
      available: false,
      reason: "invalid-time",
      message: `Times must be within 00:00–24:00 (0–${DAY_END_MINUTES} minutes). You entered start=${start}, end=${end}.`,
    };
  }

  // Time validation — ordering
  if (start >= end) {
    return {
      available: false,
      reason: "invalid-time",
      message: "Start time must be strictly before end time.",
    };
  }

  // AC1 — start must be strictly greater than now
  if (!isStartAfterNow(start, now)) {
    return {
      available: false,
      reason: "past-request",
      message: `Start time must be after the current time (${formatTime(now)}). You entered ${formatTime(start)}.`,
    };
  }

  // AC2 — duration bounds
  const duration = end - start;
  if (!isDurationAllowed(duration)) {
    return {
      available: false,
      reason: "too-long",
      message: `Requested duration is ${duration} minutes. Maximum allowed is ${MAX_BOOKING_MINUTES} minutes.`,
    };
  }

  // AC3 — overlap detection: touching endpoints are allowed (not an overlap)
  // Two intervals [s1,e1) and [s2,e2) overlap iff s1 < e2 && s2 < e1.
  for (const booking of bookings) {
    if (start < booking.end && end > booking.start) {
      return {
        available: false,
        reason: "overlapping",
        message: `Requested time ${formatTime(start)}–${formatTime(end)} overlaps with existing booking ${formatTime(booking.start)}–${formatTime(booking.end)}.`,
      };
    }
  }

  // AC4 — a blocked room is unavailable for every otherwise-valid request
  if (blocked) {
    return {
      available: false,
      reason: "blocked",
      message: `Room ${roomId} is currently blocked and cannot be booked.`,
    };
  }

  // AC5 — available; no booking is created
  return {
    available: true,
    reason: "available",
    message: `Room ${roomId} is available from ${formatTime(start)} to ${formatTime(end)} (${duration} min).`,
  };
}

/**
 * Duration-based entry point: takes a start time and a duration in minutes,
 * derives the end time, and returns the structured decision.
 */
export function evaluateDurationRequest(input: DurationInput): Decision {
  const { roomId, start, duration, now, blocked, bookings } = input;

  if (!Number.isInteger(duration) || duration < 0) {
    return {
      available: false,
      reason: "invalid-time",
      message: "Duration must be a whole number of minutes.",
    };
  }

  return decide({
    roomId,
    start,
    end: start + duration,
    now,
    blocked,
    bookings,
  });
}

/**
 * Interval-based entry point preserved for existing callers and tests.
 * Returns the same decision as the duration path for equivalent inputs.
 */
export function checkAvailability(input: AvailabilityInput): AvailabilityResult {
  const decision = decide(input);
  return { available: decision.available, message: decision.message };
}

/**
 * Coarse reason code for a request, derived from the same shared decision as
 * checkAvailability so the explainer never re-derives availability.
 */
export function classifyReason(input: AvailabilityInput): AvailabilityReasonCode {
  return decide(input).reason;
}
