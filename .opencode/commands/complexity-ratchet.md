---
name: complexity-ratchet
description: Ratchet the ESLint complexity baseline down to defaults, delegating each step's fixes to one subagent at a time. Safe to stop and resume across sessions.
---

You are the primary agent running the complexity ratchet for dnd-campaign-suite. You never fix violations yourself — you dispatch each step to a subagent, one at a time, verify, re-lock the baseline, and loop. The repo is the state: `config/complexity-baseline.js` and the source code are always the source of truth, so Paul can stop you after any subagent returns and re-running this command resumes exactly where you left off.

Optional argument: a positive integer sets the step size for every iteration (e.g. `/complexity-ratchet 5`). With no argument, use `auto` (each step drops the worst directory/metric by 25% of its headroom toward the rule default, floor 1).

## Rule defaults

- `complexity`: 15
- `max-depth`: 4
- `max-statements`: 60
- `max-params`: 5

## Primary agent loop

1. **Lock/resume:** run `npm run lint:complexity-baseline`. This regenerates the baseline from the code as it is right now — it both locks in any fixes from a previous session and recovers from a run you stopped mid-loop. Its output ends with a `REMAINING n` line.
2. If `REMAINING 0`: run `npm run lint` and `npm run test:run` once to confirm the repo is fully green, report completion, and stop.
3. **Take a step:** run `node scripts/generate-complexity-baseline.mjs --step auto` (or `--step <size>` if an integer argument was given). It lowers the worst directory/metric pair toward the default and prints `TARGET <file>:<line> <rule>=<value> limit=<limit>` lines — this step's work order.
4. **Dispatch exactly one subagent** (subagent type `general`) with the subagent task below, pasting in this step's TARGET lines. Never dispatch two subagents at once.
5. Wait for the subagent to return. **Paul may stop the loop here** — anything you do next is what resumes after a stop, so keep it short:
   a. Run `npm run lint`. If it fails, dispatch one follow-up subagent with the full failure list to get lint green (max 2 retries). If it still fails, stop and report the outstanding failures to Paul.
   b. Run `npm run test:run`. If tests fail, dispatch one subagent to fix the regressions (the ratchet refactor caused them), then re-run once. If still failing, stop and report to Paul — do not work around tests.
   c. Run `npm run lint:complexity-baseline` to re-lock the baseline at the new worst values (thresholds may cascade down several points at once when the fix was big).
   d. Report one progress line: `step done — REMAINING <new remaining>, last step: <STEP line>`.
6. Go back to step 2. Keep looping until `REMAINING 0` or Paul tells you to stop.

Never edit `eslint.config.js`, `config/complexity-baseline.js` by hand, never weaken or disable rules, never add eslint-disable comments, and never commit unless Paul explicitly asks.

## Subagent task (given to each subagent, one step at a time)

You are fixing the specific complexity violations listed below in dnd-campaign-suite. They were flagged by a one-step drop of the ESLint ratchet baseline.

TARGETS:
{paste TARGET lines from the step output}

### Rules of engagement

- Fix every TARGET: bring each listed function's metric to `limit` or below. Aim meaningfully lower where the refactor makes it natural, but `limit` is the bar.
- Preserve behavior exactly. This is live combat/spell/UI code — no API signature changes unless the TARGET is `max-params`, in which case consolidate the function's parameters into a single options object and update every call site (search for all callers, including tests).
- Techniques by metric:
  - `complexity` / `max-depth`: guard clauses and early returns, lookup tables/dispatch maps instead of long if/else or switch chains, extract cohesive helpers into the same file (or the same directory — directory baselines apply).
  - `max-statements`: extract cohesive statement blocks into named private helper functions.
  - `max-params`: options object + update all callers.
- If co-located tests reference internals you extract, update the tests to match the new structure without weakening their assertions.
- Do NOT edit `eslint.config.js` or anything in `config/`. Do NOT run `npm run lint:complexity-baseline`. Do NOT add eslint-disable comments. No new dependencies. JavaScript only (no TypeScript). No inline styles.

### Verify before returning

1. `npx eslint <each changed file>` — zero problems.
2. `npx vitest run <test files co-located with or covering the changed modules>` — all pass.
3. `npm run lint` — exit 0 (only this step's TARGETS were live; they must now be gone).
4. `npm run test:run` is NOT your job — the primary agent runs it.

Report back: final metric value for each TARGET (from the eslint message you forced by testing a temporary threshold drop, or state the reduction achieved), files changed, how you verified.
