// ── Mock LLM adapter: "Explain Availability" ──────────────────────────────────
// Pure, self-contained mock. No network, no API keys, no backend, no database.
// The availability decision is ALWAYS supplied by checkAvailability; this module
// only explains an already-confirmed result and never re-derives availability.

export type ReasonCode =
  | "available"
  | "invalid-time"
  | "past-request"
  | "too-long"
  | "blocked"
  | "overlapping";

export interface ExplanationRequest {
  roomLabel: string;
  startLabel: string; // pre-formatted "HH:MM"
  endLabel: string; // pre-formatted "HH:MM"
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplanationResult {
  explanation: string;
  degraded: boolean; // true when a fallback was used (timeout / simulated error)
}

const MAX_SENTENCE_LENGTH = 300; // guard against pathological single sentences
const MAX_EXPLANATION_LENGTH = 600; // two-sentence cap in characters
const MAX_FIELD_LENGTH = 64;

const FALLBACK =
  "We couldn't generate a detailed explanation right now. Please rely on the confirmed availability result above.";

const TEMPLATES: Record<ReasonCode, (r: ExplanationRequest) => string> = {
  available: (r) =>
    `Room ${r.roomLabel} is free from ${r.startLabel} to ${r.endLabel}, so you can book it for your study session. The slot fits within the two-hour booking limit.`,
  "invalid-time": (r) =>
    `The times you entered for ${r.startLabel}–${r.endLabel} aren't valid, so the request can't be checked. Enter both times as HH:MM on a 24-hour clock.`,
  "past-request": (r) =>
    `Your requested start at ${r.startLabel} is in the past, so ${r.roomLabel} can't be booked then. Pick a start time after the current time.`,
  "too-long": (r) =>
    `Your ${r.startLabel}–${r.endLabel} slot for ${r.roomLabel} is longer than the 120-minute limit. Shorten the interval to two hours or less.`,
  blocked: (r) =>
    `Room ${r.roomLabel} is blocked right now, so no bookings are allowed in this slot. Try a different time once the block is lifted.`,
  overlapping: (r) =>
    `Room ${r.roomLabel} already has a booking that overlaps ${r.startLabel}–${r.endLabel}. Choose a different start or end time to avoid the clash.`,
};

function isShortString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_FIELD_LENGTH
  );
}

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : text.trim().length > 0 ? 1 : 0;
}

/** Validate structured input. Returns an error string or null when valid. */
export function validateExplanationRequest(
  req: ExplanationRequest
): string | null {
  if (!req || typeof req !== "object") return "Request is missing.";
  if (!isShortString(req.roomLabel)) return "roomLabel is missing or too long.";
  if (!isShortString(req.startLabel))
    return "startLabel is missing or too long.";
  if (!isShortString(req.endLabel)) return "endLabel is missing or too long.";
  if (typeof req.isAvailable !== "boolean")
    return "isAvailable must be a boolean.";
  if (!TEMPLATES[req.reasonCode]) return "reasonCode is not recognised.";
  return null;
}

/**
 * Generate a student-friendly explanation (≤ 2 sentences). Never changes the
 * availability status and never invents booking details.
 *
 * `simulate` lets tests force a timeout or API failure without real I/O.
 */
export function explainAvailability(
  req: ExplanationRequest,
  simulate: "ok" | "timeout" | "error" = "ok"
): ExplanationResult {
  const validationError = validateExplanationRequest(req);
  if (validationError) {
    return { explanation: FALLBACK, degraded: true };
  }

  if (simulate === "timeout" || simulate === "error") {
    return { explanation: FALLBACK, degraded: true };
  }

  const draft = TEMPLATES[req.reasonCode](req);

  // Output-length guard: cap sentence count and total length.
  if (
    countSentences(draft) > 2 ||
    draft.length > MAX_EXPLANATION_LENGTH ||
    draft.split(/[.!?]/)[0].length > MAX_SENTENCE_LENGTH
  ) {
    return { explanation: FALLBACK, degraded: true };
  }

  return { explanation: draft, degraded: false };
}
