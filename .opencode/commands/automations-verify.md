---
name: automations-verify
description: work through docs/automations-manifest.json, verifying one automation per subagent.
---

You are the primary agent verifying combat automations against `docs/automations-manifest.json`. You do not verify automations yourself — you dispatch each unverified row to a single subagent, one at a time.

**CRITICAL: Before a subagent declares an automation a "setup gap" or "cannot test," it MUST actually attempt to fix the setup. Common failures from past runs:**
1. **Premature "setup gap" declaration:** Never claim a character can't cast a spell without first reading `public/data/2024/spells.json` or `public/data/spells.json` to verify which classes actually have access. Many past "setup gaps" were AI errors — Dominate Beast is a Druid/Sorcerer spell, not Bard-only; Hunter's Mark is a Ranger spell, not unavailable.
2. **Wrong spell class attribution:** Always verify spell class lists from the JSON data files before claiming a character class can't use a spell. Check both `public/data/` (5e) and `public/data/2024/` (2024 ruleset) paths.
3. **Server caching blame without evidence:** The server uses in-memory caching with 10s debounce (`changeData.js`). If character edits don't appear to take effect, wait 15+ seconds, reload, or use the Admin panel to clear the cache. Do NOT claim "server caching is blocking" as a reason to give up — this was a past AI mistake when the real issue was the client failing to POST the updated data.
4. **Wrong target type:** If a spell rejects a target type, add the correct type of NPC using the Encounter Builder rather than claiming the test cannot proceed.
5. **Level requirements:** Check spell slot levels — 6th level spells require at least level 13 characters. Don't try to cast 6th-level spells on level 9 characters.

This list exists because subagents kept giving up on fixable problems. Treat it as a floor, not a ceiling: when a subagent finds a new pitfall like these, it goes back into this list (see step 3f below) so the next subagent doesn't rediscover it the hard way.

## Support files (create if they don't exist)

- `docs/test-setup-playbook.md` — accumulated known-good recipes ("how to build a 2024 Monk," "how to force a failed saving throw," "how to join an encounter with a specific monster") **and** the pitfalls list above. Grows over time as subagents succeed or get tripped up.
- `docs/test-character-registry.json` — list of existing test characters and NPCs already present in "test-campaign," keyed by class/subclass/race/subrace/feat/background (for characters) or name (for NPCs), so reuse is a lookup instead of a search.

## Primary agent steps

1. Kill all running processes for this project: `lsof -ti:5173 -ti:80 | xargs kill -9 2>/dev/null; pkill -f "node.*server" 2>/dev/null; pkill -f "vite" 2>/dev/null; pkill -f "concurrently" 2>/dev/null`
2. Read `docs/automations-manifest.json`. Your queue is every row marked "not verified." Also read `docs/test-setup-playbook.md` and `docs/test-character-registry.json` if present (create empty versions if not) — you'll pass both to each subagent.
3. For each row, one at a time:

   a. **Skip data-granting backgrounds:** If the entry is `type: "background"` and has `"data-granting only"` in its `notes` field, mark it as `"verified"` in the manifest and move to the next row — no subagent needed.

   b. Dispatch a subagent (task template below) with: the single automation's details (name, trigger conditions, source location), the current setup playbook (including the pitfalls list), and the current character registry. Do not give it the rest of the manifest. We are in no rush; memory conservation matters more than speed.

   c. Wait for it to return.

   d. Immediately after the subagent returns, update that row's status in `docs/automations-manifest.json` on disk: `"verified"` / `"broken — see .opencode/plans/bug-<slug>.md"` / `"incomplete — see .opencode/plans/incomplete-<slug>.md"`. Write this change to the file right away — do not hold updates in memory and write them all at the end. If this run is interrupted, the file on disk should always reflect every row completed so far.

   e. **If the subagent reports a new character/NPC** (whether created or reused-and-confirmed), record it in `docs/test-character-registry.json` now, before moving to the next row.

   f. **If the subagent reports a new playbook recipe or a new pitfall it ran into** (something that cost it real time before it figured out the fix), append it to `docs/test-setup-playbook.md` now, so later rows in this same run — and future runs — benefit from it.

   g. **If a row comes back "incomplete":** re-dispatch it exactly once more with the same inputs plus the note from its incomplete-report (what it got stuck on) prepended, so the retry doesn't repeat the same dead end. If the retry is *also* incomplete, leave it as `"incomplete — needs manual setup — see .opencode/plans/incomplete-<slug>.md"` and move on. Do not retry a third time automatically — that's a signal it genuinely needs a human, not more subagent time.

   h. Move to the next row.

4. When the queue is empty, report totals: verified, broken, incomplete (needs manual setup).

---

## Subagent task (given one automation at a time)

You are verifying a single combat automation: `{automation_details}`

You are given the current **setup playbook** (including known pitfalls) and **character registry** — read both before doing anything else.

**All interaction with the running app happens through Playwright MCP.** This is a strict end-to-end test — direct data manipulation (editing save files, hitting APIs directly, etc.) invalidates the test.

### Step 1 — Orient (cheap, do this first)

1. Check the character registry for an existing character/NPCs matching what this automation needs. Reuse them if found — don't rebuild from scratch.
2. Check the setup playbook for a recipe matching this trigger type or class/subclass/feat/background combination. Follow it instead of improvising if one exists.
3. If it's unclear exactly what to build or trigger, **read the source first** (the handler/router/infoBuilder files given in the automation details, and relevant files under `public/data/2024/`, e.g. `spells.json`, `monsters.json`) rather than guessing through the UI — it's far cheaper than trial-and-error clicking and usually tells you exactly what state is needed. This is also where most of the pitfalls above get caught before they cost you time.

### Step 2 — Build/confirm the scenario (via Playwright MCP)

1. In "test-campaign," create (or edit) a 2024 character (never 5e) with the exact class/subclass/race/subrace/feat/background needed, or reuse a registry match.
2. Create or reuse any needed NPC creatures for combat/spell targeting tests via the Encounter Builder. NPC monster names must match `monsters.json` exactly — check `public/data/2024/monsters.json` or `public/data/monsters.json` rather than guessing a name.
3. If what you're given doesn't quite support the scenario (missing feature, wrong target type, wrong level), **fix it** — edit the character, add the right NPC, adjust level — rather than declaring incomplete. Run through the pitfalls checklist above first; most "can't test this" situations turn out to be one of those five.
4. **Checkpoint:** write one line to `.opencode/plans/checkpoint-<automation-id>.md` — what character/NPCs now exist and their exact names. Cheap insurance if you get compacted after this point.

### Step 3 — Trigger the scenario (via Playwright MCP)

1. Set a target before attacking — click the target icon on the creature card.
2. Trigger the specific situation named in the trigger conditions (the roll, action, or combat state). Click "Done" after attacks resolve — don't skip this step.
3. If edits don't seem to take effect, check the caching pitfall above (wait 15+ seconds / reload / clear cache via Admin panel) before assuming something is broken.

### Step 4 — Verify (via Playwright MCP)

Inspect the actual app state/UI after the trigger and confirm the automation's actual behavior matches the "Expected behavior" description exactly — not just that something happened, but that it matches (correct value, correct condition, correct timing). Close-but-not-exact counts as a bug, not a pass.

### Outcomes

**PASS:** Return `"VERIFIED: PASS"` with brief evidence, plus:
- Any new playbook recipe worth recording (what combination this was, the concrete steps that worked).
- Any new registry entry (character/NPC name + its defining traits) if you built something new.

**FAIL (automation behaved wrong, but you successfully triggered it):** Write a bug file to `.opencode/plans/bug-<id>-<slug>.md` using the Write tool, with sections: Title, Overview, Expected Behavior, Actual Behavior, Steps to Reproduce, Likely Location (use the manifest source locations), Notes. **Read it back with the Read tool to confirm it persisted** before returning — if the read fails, write and verify again. Do not return `"VERIFIED: FAIL"` until the bug file is confirmed on disk.

**INCOMPLETE — last resort only, after working through the pitfalls checklist above and actually attempting to fix setup yourself (editing the character, adding the right NPC, adjusting level, etc.):** If you still cannot get a correct scenario built and triggered, or you notice yourself repeating the same approach more than twice: stop, do not keep grinding. This is not a verdict on the automation — do not write a bug file. Write `.opencode/plans/incomplete-<id>-<slug>.md` with: what you tried (including which pitfalls you already ruled out), exactly where it stalled, and what would unblock it (a missing UI feature, a genuinely ambiguous trigger condition, etc.). Read it back to confirm it persisted, then return `"VERIFIED: INCOMPLETE"` with the file path. **This is a legitimate outcome once you've actually tried the known fixes — it is not a substitute for trying them.**

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

**Step 1:** No 2024 Monk in the registry, no matching recipe in the playbook → read `classFeatureHandler.js`/`classFeatureRouter.js` to confirm exactly what state is needed.

**Step 2:** Build a 2024 Monk in "test-campaign"; add/reuse an NPC (matched exactly to `monsters.json`) that can force a saving throw. Checkpoint the names.

**Step 3:** Start combat, have the NPC force a save, ensure the Monk fails it.

**Step 4:** Confirm proficiency applies to all saves, a reroll option appears on fail costing 1 Focus Point, and the Focus Point is actually consumed.

**Outcome:** PASS (with a new "2024 Monk — Focus Point reroll automations" playbook recipe and registry entry) / FAIL (with bug file) / INCOMPLETE (only after exhausting the pitfalls checklist).
