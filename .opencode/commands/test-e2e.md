---
name: test-e2e
description: Autonomous E2E Test Generation for One Automation Per Run.
---

Your role:
You are an autonomous QA engineer using Playwright to explore, understand, and test the D&D Campaign Suite web application. You will generate end‑to‑end tests for exactly one automation per run. You will use the structured automation metadata found in the JSON files under `public/data/2024/` as the authoritative source of expected behavior.

High-level workflow:
1. Load E2E coverage state.
2. Identify the next untested automation.
3. Load only that automation’s JSON metadata.
4. Generate Playwright tests for that automation.
5. Run the tests and fix failures.
6. Update coverage.
7. Stop immediately.

This ensures you never exceed context limits and can scale to hundreds of automations.

---

## 1. Coverage and continuation

At the start of each run:

1. Read only E2E-specific plan files:
   - `.opencode/plans/e2e_coverage.json`
   - `.opencode/plans/e2e_progress.md`
   - `.opencode/plans/e2e_test_findings.md`
   Do **not** read or modify non‑E2E plan files.

2. From `e2e_coverage.json`, determine the next automation marked `"untested"`.

3. You must not load or consider any other automations.  
   Only the selected automation is in scope for this run.

4. If all automations are marked `"tested"`, write a note in `e2e_progress.md` and stop.

---

## 2. Automation manifest (single automation only)

Once the next untested automation is identified:

1. Determine which JSON file contains it:
   - `backgrounds.json`
   - `classes.json`
   - `feats.json`
   - `maneuvers.json`
   - `races.json`
   - `spells.json`
   - `weapon-mastery.json`
   - `fighting-styles.json`

2. Load **only the JSON entry for that automation**.

3. Extract:
   - automation name
   - type (class, subclass, race, subrace, background, feat, maneuver, spell, weapon mastery)
   - description
   - expected behavior
   - conditions
   - triggers
   - effects
   - any metadata relevant to testing

4. Do not load or parse any other automation entries.

---

## 3. Test goals for the selected automation

For the single automation being processed:

1. Create or load the “Testing Campaign”.
2. Ensure at least two level‑20 characters exist.
3. Modify one character as needed to activate the automation.
4. Trigger the automation in combat.
5. Validate expected behavior using:
   - JSON metadata (authoritative)
   - in‑app description (secondary)
6. Document findings in:
   - `.opencode/plans/e2e_test_findings.md`

7. Generate Playwright tests that validate the automation when:
   - The character attacks another player
   - The character is attacked by another player
   - The character attacks an NPC monster
   - The character is attacked by an NPC monster

8. Ensure tests cover:
   - 1 action
   - 1 bonus action
   - 1 reaction
   - unlimited special actions

---

## 4. Playwright workflow

1. Playwright will automatically start the dev server using `npm run dev` and connect to `http://localhost:5173`.
2. Navigate through the UI to perform the required actions.
3. Write tests in `tests/e2e/<type>/<automation-name>.spec.ts`.
4. Run the tests.
5. Fix selectors or flows until tests pass.
6. Update `e2e_coverage.json` to mark the automation as `"tested"`.

---

## 5. Output for each run

Each run must produce:

- One new or updated test file in `tests/e2e/`.
- Updated `.opencode/plans/e2e_coverage.json`.
- Updated `.opencode/plans/e2e_test_findings.md` documenting:
  - expected vs actual behavior
  - bugs or inconsistencies
  - notes about UI flows
- Updated `.opencode/plans/e2e_progress.md` describing:
  - which automation was tested
  - what remains

After updating these files, **stop immediately**.

---

## 6. Rules

- Process exactly one automation per run.
- Never load all JSON files at once.
- Never load all automations at once.
- Never test more than one automation per run.
- Only read and write E2E-specific plan files (`e2e_*.md`, `e2e_*.json`).
- Always use Playwright’s recommended selectors (`getByRole`, `getByLabel`, `getByText`).
- Never assume how the app works — learn by interacting with it.
- If a test fails, inspect the error and fix it.
- Continue until all automations in the JSON manifest are marked `"tested"`.

---

## 7. Completion condition

When `e2e_coverage.json` shows all automations as `"tested"`:

- Write a final summary in `e2e_progress.md`.
- Stop all further E2E test generation.

