import { describe, it, expect } from "vitest";
import {
  explainAvailability,
  validateExplanationRequest,
  type ExplanationRequest,
} from "@/lib/explainAvailability";
import {
  checkAvailability,
  classifyReason,
  formatTime,
  type AvailabilityInput,
} from "@/lib/availability";
import { EXISTING_BOOKINGS, ROOM, SIMULATED_NOW } from "@/lib/demoData";

function request(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    roomId: ROOM.id,
    start: 660,
    end: 720,
    now: SIMULATED_NOW,
    blocked: false,
    bookings: EXISTING_BOOKINGS,
    ...overrides,
  };
}

function explanationFor(
  input: AvailabilityInput
): ExplanationRequest {
  const result = checkAvailability(input);
  return {
    roomLabel: ROOM.id,
    startLabel: formatTime(input.start),
    endLabel: formatTime(input.end),
    isAvailable: result.available,
    reasonCode: classifyReason(input),
  };
}

describe("explainAvailability — happy paths", () => {
  it("explains an available slot using the confirmed reason", () => {
    const req = explanationFor(request());
    const out = explainAvailability(req);
    expect(out.degraded).toBe(false);
    expect(out.explanation).toContain(ROOM.id);
    expect(out.explanation).toContain("11:00");
    expect(out.explanation).toContain("12:00");
    // ≤ 2 sentences
    expect(out.explanation.match(/[^.!?]+[.!?]+/g)?.length).toBeLessThanOrEqual(2);
  });

  it("explains an overlapping request without changing the status", () => {
    const req = explanationFor(request({ start: 630, end: 690 }));
    expect(req.isAvailable).toBe(false);
    expect(req.reasonCode).toBe("overlapping");
    const out = explainAvailability(req);
    expect(out.explanation).toContain("overlaps");
  });

  it("explains a blocked room", () => {
    const req = explanationFor(request({ blocked: true }));
    expect(req.reasonCode).toBe("blocked");
    const out = explainAvailability(req);
    expect(out.explanation).toContain("blocked");
  });

  it("explains an invalid interval", () => {
    const req = explanationFor(request({ start: 720, end: 660 }));
    expect(req.reasonCode).toBe("invalid-time");
    const out = explainAvailability(req);
    expect(out.explanation.length).toBeGreaterThan(0);
  });

  it("explains a past request", () => {
    const req = explanationFor(request({ start: 500, end: 560 }));
    expect(req.reasonCode).toBe("past-request");
    const out = explainAvailability(req);
    expect(out.explanation).toContain("past");
  });
});

describe("explainAvailability — never contradicts checkAvailability", () => {
  it("does not flip an unavailable result to available wording", () => {
    const cases = [
      request({ blocked: true }),
      request({ start: 630, end: 690 }),
      request({ start: 720, end: 900 }),
      request({ start: 500, end: 560 }),
    ];
    for (const input of cases) {
      const result = checkAvailability(input);
      const out = explainAvailability(explanationFor(input));
      expect(result.available).toBe(false);
      expect(out.explanation.toLowerCase()).not.toContain("is free from");
    }
  });
});

describe("explainAvailability — input validation", () => {
  it("rejects empty room label", () => {
    const req = explanationFor(request());
    const out = explainAvailability({ ...req, roomLabel: "" });
    expect(out.degraded).toBe(true);
    expect(out.explanation.length).toBeGreaterThan(0);
  });

  it("rejects malformed isAvailable (non-boolean coerced away)", () => {
    const req = explanationFor(request());
    const bad = { ...req, isAvailable: "yes" as unknown as boolean };
    const out = explainAvailability(bad);
    expect(out.degraded).toBe(true);
  });

  it("rejects an unknown reasonCode", () => {
    const req = explanationFor(request());
    const out = explainAvailability({
      ...req,
      reasonCode: "nope" as unknown as ExplanationRequest["reasonCode"],
    });
    expect(out.degraded).toBe(true);
  });

  it("rejects overly long field values", () => {
    const req = explanationFor(request());
    const long = "A".repeat(200);
    const out = explainAvailability({ ...req, roomLabel: long });
    expect(out.degraded).toBe(true);
  });

  it("validateExplanationRequest returns a message for missing object", () => {
    expect(validateExplanationRequest(null as unknown as ExplanationRequest)).not.toBe(null);
  });
});

describe("explainAvailability — simulated failure handling", () => {
  it("returns a safe fallback on timeout", () => {
    const out = explainAvailability(explanationFor(request()), "timeout");
    expect(out.degraded).toBe(true);
    expect(out.explanation.length).toBeGreaterThan(0);
  });

  it("returns a safe fallback on simulated API error", () => {
    const out = explainAvailability(explanationFor(request()), "error");
    expect(out.degraded).toBe(true);
    expect(out.explanation.length).toBeGreaterThan(0);
  });

  it("fallback does not change availability status", () => {
    const out = explainAvailability(explanationFor(request()), "error");
    expect(out.explanation.toLowerCase()).not.toContain("is free from");
  });
});

describe("explainAvailability — output length guard", () => {
  it("every template output is at most two sentences", () => {
    const inputs = [
      request(),
      request({ blocked: true }),
      request({ start: 630, end: 690 }),
      request({ start: 720, end: 900 }),
      request({ start: 500, end: 560 }),
      request({ start: 720, end: 660 }),
    ];
    for (const input of inputs) {
      const out = explainAvailability(explanationFor(input));
      const sentences = out.explanation.match(/[^.!?]+[.!?]+/g);
      expect(sentences?.length ?? 0).toBeLessThanOrEqual(2);
    }
  });
});
