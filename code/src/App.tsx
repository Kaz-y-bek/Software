import { useState } from "react";
import {
  DoorOpen,
  Clock,
  Users,
  CalendarRange,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  checkAvailability,
  classifyReason,
  formatTime,
  isDurationAllowed,
  isStartAfterNow,
  parseDuration,
  parseTime,
  type AvailabilityResult,
} from "@/lib/availability";
import {
  explainAvailability,
  type ExplanationResult,
} from "@/lib/explainAvailability";
import {
  ROOM,
  SIMULATED_NOW,
  EXISTING_BOOKINGS,
} from "@/lib/demoData";

export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [startStr, setStartStr] = useState<string>("11:00");
  const [durationStr, setDurationStr] = useState<string>("60");
  const [blocked, setBlocked] = useState<boolean>(false);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [explaining, setExplaining] = useState<boolean>(false);
  // Inputs most recently used to run the availability check. The explainer
  // always explains the confirmed result, so we keep them in sync with `result`.
  const [lastCheckInput, setLastCheckInput] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Run the pure availability check against current input + demo data. */
  function handleCheck() {
    const start = parseTime(startStr);
    const duration = parseDuration(durationStr);

    // If either input is malformed, show a clear validation error without
    // calling checkAvailability (which expects integers).
    if (start === null || duration === null) {
      const bad: string[] = [];
      if (start === null) bad.push(`Start "${startStr}" must be HH:MM (e.g. 09:00, 14:01).`);
      if (duration === null) bad.push(`Duration "${durationStr}" must be whole minutes (e.g. 30, 60, 120).`);
      setResult({
        available: false,
        message: `Invalid input. ${bad.join(" ")}`,
      });
      return;
    }

    const end = start + duration;
    const res = checkAvailability({
      roomId: ROOM.id,
      start,
      end,
      now: SIMULATED_NOW,
      blocked,
      bookings: EXISTING_BOOKINGS,
    });
    setResult(res);
    setLastCheckInput({ start, end });
    setExplanation(null);
  }

  /** Ask the mock LLM adapter to explain the most recent confirmed result. */
  function handleExplain() {
    if (!result || !lastCheckInput) return;
    setExplaining(true);
    // Simulate a short async call without any real network. The mock adapter
    // is synchronous; we wrap it so the UI shows a loading state.
    setTimeout(() => {
      const reasonCode = classifyReason({
        roomId: ROOM.id,
        start: lastCheckInput.start,
        end: lastCheckInput.end,
        now: SIMULATED_NOW,
        blocked,
        bookings: EXISTING_BOOKINGS,
      });
      const out = explainAvailability({
        roomLabel: ROOM.id,
        startLabel: formatTime(lastCheckInput.start),
        endLabel: formatTime(lastCheckInput.end),
        isAvailable: result.available,
        reasonCode,
      });
      setExplanation(out);
      setExplaining(false);
    }, 300);
  }

  /** Reset the form to defaults. */
  function handleReset() {
    setStartStr("11:00");
    setDurationStr("60");
    setBlocked(false);
    setResult(null);
    setExplanation(null);
    setLastCheckInput(null);
  }

  // ── Derived display values (end time is calculated from start + duration) ──
  const startMin = parseTime(startStr);
  const durationMin = parseDuration(durationStr);
  const duration = startMin !== null && durationMin !== null ? durationMin : null;
  const endMin = startMin !== null && durationMin !== null ? startMin + durationMin : null;

  // Proactive start-time validation: warn immediately when start <= now
  // without waiting for the Check button.
  const startTooEarly =
    startMin !== null && !isStartAfterNow(startMin, SIMULATED_NOW);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <DoorOpen className="w-8 h-8 text-sky-400 shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                Smart Campus Room Availability Checker
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Check whether a classroom is free during a selected time interval
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Room information card */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-sky-600 px-5 py-3 text-white">
            <h2 className="font-semibold text-sm uppercase tracking-wide">
              Classroom Information
            </h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoTile icon={<DoorOpen className="w-5 h-5" />} label="Room" value={ROOM.id} />
            <InfoTile icon={<Users className="w-5 h-5" />} label="Capacity" value={`${ROOM.capacity} students`} />
            <InfoTile
              icon={<Clock className="w-5 h-5" />}
              label="Simulated Now"
              value={formatTime(SIMULATED_NOW)}
            />
          </div>

          {/* Existing bookings list */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <CalendarRange className="w-4 h-4" />
              Existing Bookings
            </div>
            <div className="flex flex-wrap gap-2">
              {EXISTING_BOOKINGS.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(b.start)} – {formatTime(b.end)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Blocked toggle (demo control for AC3) */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Ban className={`w-5 h-5 mt-0.5 ${blocked ? "text-red-500" : "text-slate-400"}`} />
              <div>
                <p className="font-semibold text-sm text-slate-700">
                  Demo: Room Blocked Status
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle to simulate a blocked room (tests acceptance criterion AC3).
                </p>
              </div>
            </div>
            <button
              onClick={() => setBlocked((b) => !b)}
              role="switch"
              aria-checked={blocked}
              aria-label="Toggle room blocked status"
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 ${
                blocked ? "bg-red-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
                  blocked ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {blocked && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <Ban className="w-4 h-4 shrink-0" />
              {`Room ${ROOM.id} is blocked — all availability requests will return Unavailable.`}
            </div>
          )}
        </section>

        {/* Time selection form */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Select Time Interval</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start time */}
            <div>
              <label
                htmlFor="start-time"
                className="block text-sm font-medium text-slate-600 mb-1.5"
              >
                Start Time <span className="text-slate-400 font-normal">(HH:MM, 24-hour)</span>
              </label>
              <input
                id="start-time"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 12:00"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-slate-400">
                Enter 00:00–23:59.
              </p>
              {startTooEarly && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Start time must be after the current time ({formatTime(SIMULATED_NOW)}).
                </div>
              )}
            </div>

            {/* Duration in minutes — the end time is calculated from this */}
            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-slate-600 mb-1.5"
              >
                Duration <span className="text-slate-400 font-normal">(minutes, 1–120)</span>
              </label>
              <input
                id="duration"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 60"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-slate-400">
                Whole minutes. The end time is calculated automatically.
              </p>
            </div>
          </div>

          {/* Computed interval preview — suppressed when the start time violates AC1
              or inputs are malformed, so no normal-looking interval is shown
              for an invalid request. */}
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            {duration !== null && !startTooEarly ? (
              <span>
                Requested interval:{" "}
                <span
                  className={`font-semibold ${
                    !isDurationAllowed(duration) ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {startStr} – {endMin !== null ? formatTime(Math.min(endMin, 1440)) : "?"}
                </span>{" "}
                ({duration > 0 ? `${duration} min` : "invalid duration"})
              </span>
            ) : startTooEarly ? (
              <span className="text-red-600 font-medium">
                Start time is at or before current time — fix the start time to see the interval.
              </span>
            ) : (
              <span className="font-semibold text-red-600">
                Invalid input — enter a start time as HH:MM and a duration in whole minutes.
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCheck}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Check Availability
            </button>
            <button
              onClick={handleExplain}
              disabled={!result || explaining}
              className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
            >
              {explaining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Explain Availability
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg px-5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </section>

        {/* Result message */}
        {result && (
          <section
            className={`rounded-xl shadow-sm border p-5 transition-all ${
              result.available
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.available ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-bold text-lg ${
                    result.available ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result.available ? "Available" : "Unavailable"}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.available ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>

            {/* Mock AI explanation — clearly labelled, separate from the
                confirmed availability result above. */}
            {explanation && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Mock AI Explanation
                  </span>
                  {explanation.degraded && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      fallback
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {explanation.explanation}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  This explanation is generated by a mock model and does not
                  change the confirmed availability result.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Footer note */}
        <footer className="text-center text-xs text-slate-400 py-4">
          Availability checker only — no bookings are created, saved, or confirmed.
          v1 — Software Engineering Assignment #03.
        </footer>
      </main>
    </div>
  );
}

// ── Small presentational helper ───────────────────────────────────────────────

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-slate-800 text-sm">{value}</p>
      </div>
    </div>
  );
}
