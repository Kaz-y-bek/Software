
# Smart Campus — Agent Instructions

## Project Overview
Smart Campus Room Availability Checker is a React and TypeScript web application for checking the availability of one classroom using fictional booking data.

## Repository Setup
- Requirements: Node 18+ and npm.
- Install dependencies once before running any command: `npm install`.
- The app uses Vite, React 18, TypeScript (strict), Tailwind CSS, and Lucide React icons. Vitest is the test runner.
- `@supabase/supabase-js` is listed as a runtime dependency but is not imported by current application source. Do not introduce a database, backend, or auth without explicit human approval (see Engineering Rules).
- The `@/` path alias maps to `src/` (e.g. `@/lib/availability` == `src/lib/availability`).

## NPM Commands (from package.json)
- `npm run dev` — start the Vite dev server (local preview only).
- `npm run build` — production build (outputs to `dist/`).
- `npm run lint` — run ESLint.
- `npm run test` — run the Vitest suite once (`vitest run`).
- `npm run typecheck` — type-check without emitting (`tsc --noEmit -p tsconfig.app.json`).
- `npm run preview` — preview the built output locally.

## Project Structure
- src/App.tsx — user interface and state orchestration.
- src/lib/availability.ts — pure booking validation logic and shared rule predicates.
- src/lib/demoData.ts — sample room and booking fixtures (read-only).
- src/lib/explainAvailability.ts — mock LLM explainer (template-based, ≤2 sentences, degraded fallback).
- src/lib/availability.test.ts — Vitest suite for AC1–AC6 and parseTime.
- src/lib/explainAvailability.test.ts — Vitest suite for the mock explainer.
- src/lib/f1RaceVerification.test.ts — verification test reproducing the stale-explanation race in handleExplain.
- src/lib/f2CoverageVerification.test.ts — meta-test asserting no DOM testing library or UI integration test exists.
- package.json — project scripts and dependencies.

## Acceptance Criteria
- AC1: Reject invalid intervals and past requests.
- AC2: Reject durations longer than 120 minutes.
- AC3: Reject requests when the room is blocked.
- AC4: Reject overlapping bookings. Allow intervals that touch only at endpoints.
- AC5: Do not mutate booking fixture data.
- AC6: Preserve clear feedback on desktop and mobile.

## Code Conventions
- TypeScript strict mode; no `any` in new code.
- Use the `@/` path alias for imports under `src/` instead of deep relative paths.
- Use named exports for modules; default-export only the UI entry (`App`).
- Use Lucide React for icons. Do not install other UI theme or icon packages unless explicitly requested.
- Times are integer minutes after midnight (0 = 00:00, 1440 = 24:00). Keep time parsing/formatting in `availability.ts`.
- Keep pure validation logic in `src/lib/` and side-effectful UI orchestration in `src/App.tsx`.
- Tailwind CSS for styling; no inline CSS files beyond `src/index.css`.
- No comments unless a non-obvious invariant or workaround requires one.

## Engineering Rules
- Preserve all existing application behavior.
- Prefer pure functions and reusable constants.
- Keep validation logic separate from UI components.
- Use at most two justified design patterns.
- Avoid unnecessary classes or abstractions.
- Do not add authentication, a backend, a database, or booking creation.
- Do not modify existing sample booking data.
- Preserve the responsive user interface.
- The application models exactly one fictional room. Do not add additional rooms, room selection, or multi-room logic.
- Never hardcode, commit, or transmit API keys, passwords, tokens, or other secrets. The `.env` file must never be added to version control.
- Do not deploy, publish, push to a remote, or release to any external environment without explicit human approval.
- Do not add, upgrade, or remove npm dependencies without explicit human approval. The absence of a DOM testing library is an intentional invariant (see Known Verification Invariants).

## Known Verification Invariants
- F1 (stale-explanation race): `handleExplain` in `src/App.tsx` schedules an unguarded `setTimeout`. `src/lib/f1RaceVerification.test.ts` documents this race and must be updated alongside any fix; do not change the race behavior without human approval.
- F2 (no DOM testing library): `src/lib/f2CoverageVerification.test.ts` asserts that `@testing-library/react`, `jsdom`, and `happy-dom` are absent and that no test imports `App`. Adding any of these will break the suite.

## Verification
- Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` before declaring a change complete. All four must pass.
- Add focused regression tests for AC1–AC6 for any change that touches availability logic or the UI feedback path.
- Do not accept a change if any of typecheck, lint, test, or build fails. Report actual results, not expected ones.
- Verify the application on desktop and mobile.
- Report actual test results, changed files and limitations.

## Completion Requirements
- Explain each changed file.
- Explain why the refactoring improves maintainability.
- Provide evidence that booking behavior is unchanged.
- Report passing and failing tests accurately.

## Safe Commands
- Allow-list: `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm run test`, `npm run typecheck`, `npm run preview`.

## Forbidden Operations (without explicit human approval)
- Secrets: never hardcode, commit, or transmit API keys, passwords, tokens, or other secrets; never add `.env` to version control.
- Production deployments: no `git push`, `git push --force`, `npm publish`, or any deploy/release command.
- Destructive commands: no deleting files outside the current task scope, no `rm -rf`, no dropping or truncating data.
- Dependency changes: no adding, upgrading, or removing npm packages (preserves the F2 invariant).

## Human Review Gate
- No change may be merged or deployed until a human reviewer has confirmed that `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` all pass and that AC1–AC6 behavior is preserved.
