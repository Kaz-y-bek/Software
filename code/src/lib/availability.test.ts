import { describe, it, expect } from "vitest";
import {
  checkAvailability,
  isDurationAllowed,
  isStartAfterNow,
  parseTime,
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

describe("AC1: invalid intervals and past requests are rejected", () => {
  it("rejects non-integer minutes", () => {
    expect(checkAvailability(request({ start: 660.5 })).available).toBe(false);
  });

  it("rejects times outside 0-1440", () => {
    expect(checkAvailability(request({ start: -1 })).available).toBe(false);
    expect(checkAvailability(request({ end: 1441 })).available).toBe(false);
  });

  it("accepts end-of-day 1440 as an end time", () => {
    expect(checkAvailability(request({ start: 1380, end: 1440 })).available).toBe(true);
  });

  it("rejects start not before end", () => {
    const result = checkAvailability(request({ start: 720, end: 660 }));
    expect(result.available).toBe(false);
    expect(result.message).toBe("Start time must be strictly before end time.");
  });

  it("rejects a start equal to the current time", () => {
    const result = checkAvailability(request({ start: SIMULATED_NOW, end: 600 }));
    expect(result.available).toBe(false);
    expect(result.message).toContain("09:00");
  });

  it("rejects a start in the past", () => {
    expect(checkAvailability(request({ start: 500, end: 560 })).available).toBe(false);
  });

  it("isStartAfterNow is strict", () => {
    expect(isStartAfterNow(SIMULATED_NOW, SIMULATED_NOW)).toBe(false);
    expect(isStartAfterNow(SIMULATED_NOW + 1, SIMULATED_NOW)).toBe(true);
  });
});

describe("AC2: durations over 120 minutes are rejected", () => {
  it("rejects 121 minutes", () => {
    const result = checkAvailability(request({ start: 720, end: 841 }));
    expect(result.available).toBe(false);
    expect(result.message).toContain("121 minutes");
  });

  it("accepts exactly 120 minutes", () => {
    expect(checkAvailability(request({ start: 720, end: 840 })).available).toBe(true);
  });

  it("isDurationAllowed boundaries", () => {
    expect(isDurationAllowed(0)).toBe(false);
    expect(isDurationAllowed(1)).toBe(true);
    expect(isDurationAllowed(120)).toBe(true);
    expect(isDurationAllowed(121)).toBe(false);
  });
});

describe("AC3: blocked room rejects every request", () => {
  it("rejects a valid request when the room is blocked", () => {
    const result = checkAvailability(request({ blocked: true }));
    expect(result.available).toBe(false);
    expect(result.message).toBe(`Room ${ROOM.id} is currently blocked and cannot be booked.`);
  });
});

describe("AC4: overlapping bookings are rejected, touching endpoints allowed", () => {
  it("rejects an interval overlapping the existing 10:00-11:00 booking", () => {
    const result = checkAvailability(request({ start: 630, end: 690 }));
    expect(result.available).toBe(false);
    expect(result.message).toContain("overlaps with existing booking 10:00–11:00");
  });

  it("allows an interval that starts exactly when a booking ends", () => {
    expect(checkAvailability(request({ start: 660, end: 720 })).available).toBe(true);
  });

  it("allows an interval that ends exactly when a booking starts", () => {
    expect(checkAvailability(request({ start: 570, end: 600 })).available).toBe(true);
  });
});

describe("AC5: fixture data is not mutated", () => {
  it("leaves bookings and the sample fixture unchanged after a check", () => {
    const bookingsBefore = structuredClone(EXISTING_BOOKINGS);
    const input = request({ start: 630, end: 690 });
    const inputBefore = structuredClone(input);

    checkAvailability(input);
    checkAvailability(request());

    expect(EXISTING_BOOKINGS).toEqual(bookingsBefore);
    expect(input).toEqual(inputBefore);
  });
});

describe("AC6: clear feedback for every outcome", () => {
  it("available result states the room, times and duration", () => {
    const result = checkAvailability(request({ start: 660, end: 720 }));
    expect(result.available).toBe(true);
    expect(result.message).toBe(`Room ${ROOM.id} is available from 11:00 to 12:00 (60 min).`);
  });

  it("every rejection returns a non-empty explanation", () => {
    const rejections = [
      request({ start: 660.5 }),
      request({ start: 720, end: 660 }),
      request({ start: 500, end: 560 }),
      request({ start: 720, end: 900 }),
      request({ blocked: true }),
      request({ start: 630, end: 690 }),
    ];
    for (const input of rejections) {
      const result = checkAvailability(input);
      expect(result.available).toBe(false);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe("parseTime", () => {
  it("parses valid HH:MM strings", () => {
    expect(parseTime("09:00")).toBe(540);
    expect(parseTime("9:00")).toBe(540);
    expect(parseTime("24:00")).toBe(1440);
  });

  it("rejects malformed strings", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("24:01")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("abc")).toBeNull();
  });
});
