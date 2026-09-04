# BUG MN-016 — Rally (2024 Battle Master bonus-action maneuver): picker never rendered, die spent with no effect

**VERDICT: FAIL** (2026-09-03, test-campaign, EvasiveFighter Battle Master lv18)

## Canonical rule (public/data/2024/maneuvers.json "Rally" — data is CORRECT)
Bonus Action, expend 1 Superiority Die, ally within 30 ft who can see/hear gains temp HP = die + floor(fighter_level/2). lv18 → d12 + 9 (getSuperiorityDieSize automationExpressions.js:56 >=18→12; extraHpExpression "fighter_level / 2").

## Live failure evidence
1. Selected 'Rally' via sheet "Combat Superiority:" picker → runtime `EvasiveFighter.BattleMasterManeuvers_selection:["Rally"]` written → Bonus Actions row `<b class="clickable">Rally:</b>` rendered live.
2. Click #1 (Relentless live, round 1): die rolled free, `relentlessUsedRound=1` stamped (free use consumed), log "Rally: Choose an ally to gain temporary hit points." written — NO picker modal appeared, NO popup, nothing.
3. Click #2 same round: `superiorityDice` 6→5 **real die expended**, again zero picker, zero popup. `HexWarlock` (only realistic ally) has NO `tempHp` in change-data. Two identical "Choose an ally" logs, no grant log.

## Root cause
`executeBonusActionManeuver` (src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js:21) rolls (line 37) and spends the die (line 38) BEFORE the temp_hp ally branch (:57-103) returns `{type:'modal', modalName:'rallyChoice'}`. The sheet row click goes through `handleAutomationAction` → switch on result.type 'modal' (src/components/char-sheet/useCharActionsAutomation.js:210-215) does `modalMap[result.modalName]` — **modalMap (:29-138) has NO `rallyChoice` key** → handler undefined, modal silently dropped AFTER spend. No console error (silent).

Secondary gaps:
- Combat Superiority picker "Use Maneuver" route (useCombatSuperiorityModal.js:38/:131 DOES dispatch `rally-choice-modal-show`) is UNREACHABLE: dispatchers.js:90 `selectionMode = forceSelectionMode || knownManeuvers.length !== allManeuvers.length` — known 1 (or max 9) vs all 20 is always unequal → row click always opens Select-mode, never Use-mode; no other production dispatch of `rally-choice-modal-show` exists (grep: only useCombatSuperiorityModal.js:39/:131).
- `handleRallyChoiceConfirm` (src/components/char-sheet/useCharActionsModalHandlers.js:78-95) discards `result.logEntries` — the canonical grant log "Rally: X gains N temporary hit points" (executeRallyChoice combatSuperiorityUtils.js:300-306) never reaches the campaign log even when confirm runs.
- Die spend precedes the allies-empty check (executeActionManeuvers.js:37-38 vs :66) — no allies = wasted die.
- Gridless (accepted precedent CLA-260/CLA-189): no 30-ft/see-or-hear gate; allyOptions = combatSummary creatures minus self (monsters would be listed — none staged this run).

## Positive proof (synthetic-event plumbing probe — never dispatched in production)
Manual `window.dispatchEvent(new CustomEvent('rally-choice-modal-show', {detail:{dieValue:7,totalHp:16,extraHp:9,allyOptions:[HexWarlock]}}))` → Rally picker modal renders ("Rally / HexWarlock / Grant Temp HP / Skip") → tick HexWarlock → Grant → change-data `HexWarlock.tempHp=16` (setTempHp max-replace, tempHpService.js) + `pendingExpirations {target:HexWarlock, effects:[{type:rally_clear}], expireOnCreatureName:EvasiveFighter}` registered. So picker UI, temp-HP writer, math shape (die+9) and expiration are all intact — ONLY the row→modal dispatch is missing.

## Suggested fix
Add `rallyChoice: simpleModal('rallyChoiceModal')` to modalMap in useCharActionsAutomation.js (modal + confirm handler + event listener already exist), AND `await addEntry` loop for result.logEntries in handleRallyChoiceConfirm; ideally move roll/expend in executeBonusActionManeuver to after the allies-empty check.

## State left after test
Rally selection + spent dice + HexWarlock tempHp=16 + probe logs cleared via Admin Clear Change Data + Clear Campaign Log at end of run. EvasiveFighter remains Battle Master lv18 (unchanged permanent config).
