// ── Demo data for the Smart Campus Room Availability Checker ─────────────────
// All times are minutes after midnight.

export const ROOM = {
  id: "A-101",
  capacity: 30,
  description: "Lecture Hall",
};

// Simulated current time: 09:00 = 540 minutes
export const SIMULATED_NOW = 540;

// Existing booking: 10:00–11:00 (600–660 minutes)
export const EXISTING_BOOKINGS = [
  { start: 600, end: 660 },
];


