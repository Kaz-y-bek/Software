// Practice 12 — eight acceptance tests for the duration-based availability flow.
// Room A-101, simulated now = 09:00 (540), existing booking 10:00–11:00 (600–660).
import { describe, it, expect } from "vitest";
import {
  evaluateDurationRequest,
  type DurationInput,
} from "@/lib/availability";
import { EXISTING_BOOKINGS, ROOM, SIMULATED_NOW } from "@/lib/demoData";

function request(overrides: Partial<DurationInput> = {}): DurationInput {
  return {
    roomId: ROOM.id,
    start: 660, // 11:00, after the 10:00–11:00 booking
    duration: 60,
    now: SIMULATED_NOW,
    blocked: false,
    bookings: EXISTING_BOOKINGS,
    ...overrides,
  };
}

describe("Practice 12 acceptance tests", () => {
  it("T1 free interval: 11:00 + 60 min is available", () => {
    const d = evaluateDurationRequest(request());
    expect(d.available).toBe(true);
    expect(d.reason).toBe("available");
    expect(d.message).toContain("11:00");
    expect(d.message).toContain("12:00");
  });

  it("T2 overlap: 10:30 + 60 min overlaps the 10:00–11:00 booking", () => {
    const d = evaluateDurationRequest(request({ start: 630 }));
    expect(d.available).toBe(false);
    expect(d.reason).toBe("overlapping");
    expect(d.message).toContain("overlaps with existing booking 10:00–11:00");
  });

  it("T3 blocked room: valid request is rejected when blocked", () => {
    const d = evaluateDurationRequest(request({ blocked: true }));
    expect(d.available).toBe(false);
    expect(d.reason).toBe("blocked");
    expect(d.message).toContain("blocked");
  });

  it("T4 zero duration is rejected", () => {
    const d = evaluateDurationRequest(request({ duration: 0 }));
    expect(d.available).toBe(false);
    expect(d.reason).toBe("invalid-time");
    expect(d.message).toContain("strictly before");
  });

  it("T5 121 minutes exceeds the 120-minute maximum", () => {
    const d = evaluateDurationRequest(request({ start: 720, duration: 121 }));
    expect(d.available).toBe(false);
    expect(d.reason).toBe("too-long");
    expect(d.message).toContain("121 minutes");
  });

  it("T6 past start: 08:00 + 60 min is rejected because start <= now", () => {
    const d = evaluateDurationRequest(request({ start: 480 }));
    expect(d.available).toBe(false);
    expect(d.reason).toBe("past-request");
    expect(d.message).toContain("09:00");
  });

  it("T7 adjacent interval: 11:00 start touching the 10:00–11:00 booking end is free, and a request ending exactly at 10:00 is free", () => {
    const startsAtBookingEnd = evaluateDurationRequest(request({ start: 660, duration: 30 }));
    expect(startsAtBookingEnd.available).toBe(true);

    const endsAtBookingStart = evaluateDurationRequest(request({ start: 570, duration: 30 }));
    expect(endsAtBookingStart.available).toBe(true);
    expect(endsAtBookingStart.reason).toBe("available");
  });

  it("T8 unchanged booking data: the fixture is not mutated by any check", () => {
    const before = structuredClone(EXISTING_BOOKINGS);
    evaluateDurationRequest(request({ start: 630 }));
    evaluateDurationRequest(request({ blocked: true }));
    evaluateDurationRequest(request({ duration: 0 }));
    expect(EXISTING_BOOKINGS).toEqual(before);
  });
});
