---
name: automations-verify
description: work through docs/automations-manifest.json, verifying one automation per subagent.
---

You are the primary agent verifying combat automations against docs/automations-manifest.json. You do not verify automations yourself — you dispatch each unverified row to a subagent, one at a time.

## Primary agent steps

1. Kill all running processes for this project: `lsof -ti:5173 -ti:80 | xargs kill -9 2>/dev/null; pkill -f "node.*server" 2>/dev/null; pkill -f "vite" 2>/dev/null; pkill -f "concurrently" 2>/dev/null`
2. Read `docs/automations-manifest.json`. Your queue is every row marked "not verified."
2. For each row, one at a time:
     a. **Skip data-granting backgrounds:** If the entry is `type: "background"` and has `"data-granting only"` in its `notes` field, mark it as `"verified"` in the manifest and move to the next row — no subagent needed.
     b. Dispatch a subagent with the single automation's details (name, trigger conditions, source location). Do not give it the rest of the manifest. We are in no rush, and memory conservation is more important than speed.
     c. Wait for it to return.
     d. Immediately after the subagent returns, update that row's status in `docs/automations-manifest.json` on disk: "verified" / "broken — see .opencode/plans/bug-<slug>.md" / "blocked — <reason>". Write this change to the file right away — do not hold updates in memory and write them all at the end. If this run is interrupted, the file on disk should always reflect every row completed so far.
     e. Move to the next row.
3. When the queue is empty, report totals: verified, broken, blocked.

## Subagent task (given one automation at a time)

You are verifying a single combat automation: {automation_details}

1. In "test-campaign", using Playwright MCP, create (or edit) a 2024 character (never 5e) with the exact class/subclass/race/subrace/feat/background combination needed to trigger this automation. Reuse an existing test character if one already has the right combination rather than creating a new one every time.
2. **You MUST create the test character if none exists.** Never block or skip an automation because a test character is missing. Create the needed character (correct class, subclass, race, subrace, feat, level, background) in "test-campaign" using Playwright to set up the test conditions. Also create any needed NPC creatures for combat/spell targeting tests.
3. Trigger the situation where the automation should apply (the specific roll, action, or combat state named in its trigger conditions).
4. Confirm the automation's actual behavior matches the "Expected behavior" description from the manifest exactly — not just that something happened, but that what happened matches what the description says should happen (correct value, correct condition, correct timing). If the observed behavior is close but not exactly what the description states, treat that as a bug, not a pass.
5. **TIME LIMIT INSTRUCTION:** You have limited context. If you find yourself repeating the same reasoning or code analysis more than 3 times, STOP and report back what you're stuck on. Do NOT continue looping. Write your findings immediately, even if incomplete.
6. **If the automation FAILS (anything other than exact pass):** You MUST write a bug file to `/Users/paulgilchrist/Source/dnd-campaign-suite/.opencode/plans/bug-<id>-<slug>.md` using the **Write tool**. The bug file must include these sections: Title, Overview, Expected Behavior, Actual Behavior, Steps to Reproduce, Likely Location (use the manifest source locations), Notes.
7. **BUG FILE VERIFICATION (MANDATORY ON FAILURE):** After writing the bug file, you MUST read it back using the Read tool to confirm it was persisted to disk. If the Read tool cannot find or read the file, write it again immediately and verify again. **You are not allowed to report a failure result until the bug file has been confirmed to exist on disk.**
8. **Final checklist before returning:**
    - If pass: return "VERIFIED: PASS" with brief evidence
    - If fail: **first** confirm the bug file exists on disk via Read tool, **then** return "VERIFIED: FAIL" with the bug file path
    - **If you observed a failure but have not confirmed a bug file on disk, your task is incomplete — do not return yet**

**IMPORTANT: Never mark an automation as "blocked." There are no valid blocking conditions. If the needed character, creature, or test condition does not exist, CREATE IT. The only statuses allowed are "verified" or "broken — see /Users/paulgilchrist/Source/dnd-campaign-suite/.opencode/plans/bug-<slug>.md".**

Scope rule applies as always: only mutate data inside "test-campaign."

You are verifying a single combat automation: CLA-087 "Disciplined Survivor"

## Automation Details
- **ID:** CLA-087
- **Name:** Disciplined Survivor
- **Type:** classFeature
- **Class:** Monk
- **Handler:** src/services/combat/automation/handlers/classFeatureHandler.js
- **Router:** src/services/combat/automation/routers/classFeatureRouter.js
- **InfoBuilder:** src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js
- **Trigger Conditions:** Trigger: failed_saving_throw
- **Expected Behavior:** Proficiency in all saving throws. When you fail a saving throw, expend 1 Focus Point to reroll it.

## Instructions

1. In "test-campaign", using Playwright MCP, create (or edit) a 2024 Monk character. Reuse an existing test character if one already exists rather than creating a new one.

2. **You MUST create the test character if none exists.** Create a Monk in "test-campaign" using Playwright to set up the test conditions.

3. Trigger a situation where the Monk fails a saving throw. You may need to:
   - Start a combat encounter
   - Have an enemy NPC attack or use an ability that forces a saving throw against the Monk
   - Ensure the Monk fails the save

4. Confirm the automation's actual behavior matches the expected behavior:
   - The Monk should have proficiency in ALL saving throws
   - When the Monk fails a saving throw, there should be an option to expend 1 Focus Point to reroll it
   - The Focus Point should be consumed when used

5. **TIME LIMIT:** If you find yourself repeating the same reasoning more than 3 times, STOP and report back what you're stuck on.

6. **If the automation FAILS:** Write a bug file to `/Users/paulgilchrist/Source/dnd-campaign-suite/.opencode/plans/bug-cla-087-disciplined-survivor.md` with sections: Title, Overview, Expected Behavior, Actual Behavior, Steps to Reproduce, Likely Location, Notes.

7. **BUG FILE VERIFICATION (MANDATORY ON FAILURE):** After writing the bug file, you MUST read it back using the Read tool to confirm it was persisted to disk.

8. **Final checklist before returning:**
   - If pass: return "VERIFIED: PASS" with brief evidence
   - If fail: first confirm the bug file exists on disk via Read tool, then return "VERIFIED: FAIL" with the bug file path

**IMPORTANT: Never mark an automation as "blocked." Create the needed character/condition. The only statuses allowed are "verified" or "broken."**

Scope: only mutate data inside "test-campaign."

**Critical tips:**
- NPC monster names must match monsters.json exactly. Check `public/data/2024/monsters.json` or `public/data/monsters.json`.
- Set a target before attacking - click the target icon on the creature card.
- Click "Done" after attacks resolve - don't skip this step.
- Clean up after testing: clear change data cache and campaign log via admin panel.