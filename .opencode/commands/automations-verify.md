---
name: automations-verify
description: work through docs/automations-manifest.json, verifying one automation per subagent.
---

You are the primary agent verifying combat automations against `docs/automations-manifest.json`. You do not verify automations yourself, and you do not do setup or testing in a single subagent — you dispatch **two subagents per automation**: one for setup, one for testing.

This version fixes all three: subagents read/write a shared **setup playbook** and **character registry** so knowledge compounds across runs, **setup and testing are separate subagent dispatches** so each gets a full fresh context budget instead of splitting one budget across both, and there's a real **exit state** ("incomplete") that isn't a verdict on the automation and isn't a silent hang.

## Support files (create if they don't exist)

- `docs/test-setup-playbook.md` — accumulated known-good recipes: "how to create a 2024 Monk," "how to force a failed saving throw," "how to join encounter with a specific monster/npc," etc. Grows over time as subagents succeed.
- `docs/test-character-registry.json` — list of existing test characters and NPCs already present in "test-campaign," keyed by class/subclass/race/subrace/feat/background (for characters) or name (for NPCs), so reuse is a lookup instead of a search.

## Primary agent steps

1. Kill all running processes for this project: `lsof -ti:5173 -ti:80 | xargs kill -9 2>/dev/null; pkill -f "node.*server" 2>/dev/null; pkill -f "vite" 2>/dev/null; pkill -f "concurrently" 2>/dev/null`
2. Read `docs/automations-manifest.json`. Your queue is every row marked "not verified." Also read `docs/test-setup-playbook.md` and `docs/test-character-registry.json` if present (create empty versions if not).
3. For each row, one at a time:

   a. **Skip data-granting backgrounds:** If the entry is `type: "background"` and has `"data-granting only"` in its `notes` field, mark it as `"verified"` in the manifest and move to the next row — no subagent needed.

   b. **Check the registry first.** If it already has a character and any needed NPCs matching this automation's requirements, skip straight to step (d) — dispatch the TEST subagent directly with those names. No setup subagent needed.

   c. **Otherwise, dispatch a SETUP subagent** (task template below) with: the automation's details, the current setup playbook, and the current character registry. Its only job is to get the right character and NPC(s) existing and confirmed in "test-campaign," then stop. It does not trigger the scenario and does not verify anything.
      - When it returns, record the character/NPC names it produced into `docs/test-character-registry.json`, and append any new recipe it found to `docs/test-setup-playbook.md`, immediately, before moving on.
      - If it returns `"SETUP: INCOMPLETE"` instead, treat this row as incomplete (see step f) and do not dispatch a test subagent for it.

   d. **Dispatch a TEST subagent** (task template below) with: the automation's details and the exact character/NPC names from the registry (either just-created or previously existing). Its only job is to trigger the scenario and verify the result — it should not need to create anything new. If it discovers the existing character/NPCs are insufficient, that's also a legitimate "incomplete."

   e. Immediately after the test subagent returns, update that row's status in `docs/automations-manifest.json` on disk: `"verified"` / `"broken — see .opencode/plans/bug-<slug>.md"` / `"incomplete — see .opencode/plans/incomplete-<slug>.md"`. Write this change right away — do not hold updates in memory. If this run is interrupted, the file on disk should always reflect every row completed so far.

   f. **If a row comes back "incomplete"** (from either subagent): re-dispatch the failing stage exactly once more, with the note from its incomplete-report (what it got stuck on) prepended, so the retry doesn't repeat the same dead end. If the retry is *also* incomplete, leave it as `"incomplete — needs manual setup — see .opencode/plans/incomplete-<slug>.md"` and move on. Do not retry a third time automatically — that's a signal it genuinely needs a human, not more subagent time.

   g. Move to the next row.

4. When the queue is empty, report totals: verified, broken, incomplete (needs manual setup).

---

## SETUP subagent task (given one automation at a time)

You are setting up a test scenario for a single combat automation: `{automation_details}`

**Your only job is to get a correctly-built character and any needed NPC(s) existing and confirmed in "test-campaign," then stop.** Do not trigger the scenario. Do not attempt to verify the automation's behavior. Someone else does that next, in a fresh session — your entire context budget is for setup, so use it.

You are given the current **setup playbook** and **character registry** — read them before doing anything else.

**All interaction with the running app happens through Playwright MCP.**

### Step 1 — Orient (cheap, do this first)

1. Check the character registry for an existing character/NPCs matching what this automation needs. If a full match exists, you have nothing to do — report it and stop.
2. Check the setup playbook for a recipe matching this class/subclass/feat/background or NPC combination. If one exists, follow it instead of improvising.
3. If it's unclear exactly what to build, **read the source first** (the handler/router/infoBuilder files given in the automation details, and relevant files under `public/data/2024/`) rather than guessing through the UI — it's far cheaper than trial-and-error clicking and usually tells you exactly what state is needed.

### Step 2 — Build it (via Playwright MCP)

1. In "test-campaign," using Playwright MCP, create (or edit) a 2024 character (never 5e) with the exact class/subclass/race/subrace/feat/background needed. Use a registry match or playbook recipe if you found one.
2. Create any needed NPC creatures for combat/spell targeting tests. NPC monster names must match `monsters.json` exactly — check `public/data/2024/monsters.json` or `public/data/monsters.json` rather than guessing a name.
3. Confirm the character/NPCs are correctly built (right proficiencies, right level, right features present) before reporting success — a wrong character here wastes the entire test subagent's budget later.

### Outcomes

**SETUP: DONE** — report the exact character name and any NPC names, plus:
- Any new recipe worth adding to the playbook (a few sentences: what combination this was, the concrete steps that worked).
- The registry entry to add (character/NPC name + its defining traits).

**SETUP: INCOMPLETE** — if you cannot get a correct character or NPC built (missing UI feature, ambiguous requirement, repeated failures on the same step, or you notice yourself repeating the same approach more than twice): stop, do not keep grinding. Write `.opencode/plans/incomplete-<id>-<slug>.md` with what you tried and exactly where it stalled. Read it back to confirm it persisted, then return `"SETUP: INCOMPLETE"` with the file path. **This is a legitimate outcome, not a failure to try hard enough.**

### Scope

Only mutate data inside "test-campaign."

---

## TEST subagent task (given one automation plus ready-made character/NPC names)

You are testing a single combat automation: `{automation_details}`

The following already exist and are confirmed correct in "test-campaign" — use them as-is, do not recreate them: `{character_name}`, `{npc_names}`.

**All interaction with the running app happens through Playwright MCP.**

### Step 1 — Trigger the scenario

1. Using Playwright MCP, set a target before attacking — click the target icon on the creature card.
2. Using Playwright MCP, trigger the specific situation named in the trigger conditions (the roll, action, or combat state). Click "Done" after attacks resolve — don't skip this step.
3. If the provided character/NPCs turn out not to actually support triggering this scenario (e.g. missing a feature you expected), that's a setup problem, not something to fix yourself — go to the Incomplete path below and say so; don't start rebuilding characters in a test subagent.

### Step 2 — Verify

Using Playwright MCP, inspect the actual app state/UI after the trigger and confirm the automation's actual behavior matches the "Expected behavior" description exactly — not just that something happened, but that it matches (correct value, correct condition, correct timing). Close-but-not-exact counts as a bug, not a pass.

### Outcomes

**PASS:** Return `"VERIFIED: PASS"` with brief evidence.

**FAIL (automation behaved wrong, but you successfully triggered it):** Write a bug file to `.opencode/plans/bug-<id>-<slug>.md` using the Write tool, with sections: Title, Overview, Expected Behavior, Actual Behavior, Steps to Reproduce, Likely Location (use the manifest source locations), Notes. **Read it back with the Read tool to confirm it persisted** before returning — if the read fails, write and verify again. Do not return `"VERIFIED: FAIL"` until the bug file is confirmed on disk.

**INCOMPLETE (you cannot trigger the scenario with what you were given, or you notice yourself repeating the same approach more than twice):** This is not a verdict on the automation — do not write a bug file. Write `.opencode/plans/incomplete-<id>-<slug>.md` with: what you tried, exactly where it stalled, and whether the problem looks like a setup gap (say so explicitly — this tells the primary agent to redo setup, not just retry testing). Read it back to confirm it persisted, then return `"VERIFIED: INCOMPLETE"` with the file path.

### Scope

Only mutate data inside "test-campaign." Clean up after testing: clear change-data cache and campaign log via the admin panel.

---

## Worked example — CLA-087 "Disciplined Survivor"

**Automation Details**
- **ID:** CLA-087
- **Name:** Disciplined Survivor
- **Type:** classFeature
- **Class:** Monk
- **Handler:** `src/services/combat/automation/handlers/classFeatureHandler.js`
- **Router:** `src/services/combat/automation/routers/classFeatureRouter.js`
- **InfoBuilder:** `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`
- **Trigger Conditions:** `failed_saving_throw`
- **Expected Behavior:** Proficiency in all saving throws. When you fail a saving throw, expend 1 Focus Point to reroll it.

**Registry check:** no existing 2024 Monk on file → dispatch a SETUP subagent.

**SETUP subagent:** reads `classFeatureHandler.js`/`classFeatureRouter.js` to confirm what's needed, builds a 2024 Monk in "test-campaign," picks/creates an NPC that can force a saving throw, confirms both are correct, returns `"SETUP: DONE"` with the character name, NPC name, and a new playbook recipe ("2024 Monk — Focus Point reroll automations").

**Primary agent:** records the registry entry and playbook recipe, then dispatches a TEST subagent with those exact names.

**TEST subagent:** starts combat, has the NPC force a save, ensures the Monk fails it, confirms proficiency applies to all saves, a reroll option appears costing 1 Focus Point, and the Focus Point is actually consumed. Returns `"VERIFIED: PASS"` (or FAIL/INCOMPLETE per the rules above).

**Next automation needing a 2024 Monk:** registry already has one — no SETUP subagent needed, go straight to TEST.
