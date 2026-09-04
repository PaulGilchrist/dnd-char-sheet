# bug-cla-290 — Relentless Rage: gate is ragePoints (uses pool) not rage-active; no Short-Rest DC reset

Verdict: FAIL (control violation: feature fires when Rage is NOT active)

## Canonical (public/data/2024/classes.json Barbarian lv11, verified exact)
"If you drop to 0 Hit Points while your Rage is active and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, your Hit Points instead change to twice your Barbarian level. Each time you use this feature after the first, the DC increases by 5. When you finish a Short or Long Rest, the DC resets to 10."
automation: {type:reaction_save_heal, saveType:CON, saveDc:10, dcScaling:5, healExpression:"2 * barbarian_level", recharge:short_or_long_rest, casting_time:passive}

## Defect 1 — wrong raging gate (FAIL driver)
- src/services/rules/features/relentlessRageService.js:60-64 gates on runtime `ragePoints > 0` — the remaining Rage USES resource, not whether the Rage stance is active.
- Sheet "Rage:" re-click ends the stance ("Rage ended" popup, change-data `activeBuffs:[]`) but leaves `ragePoints:5` untouched.
- LIVE control proof (2026-09-03, DraconicDragon lv20): stance verified `activeBuffs:[]` in change-data, HP committed 5 via trusted fill+Enter, Wight Necrotic Sword HIT → `.sp-overlay "Saving Throw Required ... DC 20"` fired + log `ability_use "Relentless Rage triggered — DraconicDragon must make CON save (DC 20)"` — while NOT raging. Direct death-save path suppressed (no `.dsp-overlay` until the save itself failed).
- Secondary consumer reactionSaveHealHandler.js:47-49 has the same ragePoints-based gate.
- Fix direction: gate on the active Rage stance (`activeBuffs` entry `effect:'stance'`/name 'Rage') instead of, or in addition to, ragePoints.

## Defect 2 — Short Rest does not reset the DC
- Uses key `relentlessrageUses` appears ONLY in `LONG_REST_RESOURCES` (src/services/rules/effects/restRules-constants.js:183); absent from `SHORT_REST_RESOURCES` (:59-84).
- LIVE proof: after Short Rest → "Complete Short Rest", change-data `relentlessrageUses` remained 3 (canonical requires reset → DC back to 10).
- Long Rest reset WORKS: uses → null, next drop prompted DC 10, save success → `currentHitPoints:40` exact.

## Verified working (do not re-report)
- DC 10 first use (drop-to-0 while raging, .sp-overlay interactive prompt, no .dsp fallback).
- Save success → HP exactly 2×level = 40 (change-data `currentHitPoints:40` + log "Relentless Rage sets Hit Points to 40").
- Escalation: DC 15 (2nd), DC 20 (3rd) live prompts + logs.
- Save fail → stays 0 HP, death-save prompt proceeds (.dsp-overlay), uses incremented.
- Dragonborn race: no Orc Relentless Endurance/Overkill interference.

## Repro recipe
See playbook pitfall 36/37 + docs/test-setup-playbook.md CLA-288-style flow: EB-join Wight, Rage via sheet BA, HP 5 via trusted spinbutton fill+Enter (native-setter never commits), walk Next to Wight card, avatar .mc-overlay "+4" link.

## State left
Wight removed (confirm probe 82 HP = no side effects); Admin Clear Change Data + Campaign Log accepted; change-data/log files absent from disk. DraconicDragon unchanged lv20 Barbarian Path of the Wild Heart, Warhammer equipped; runtime cleared (HP re-derives from sheet, rage/uses counters null).
