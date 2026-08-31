# Bug — SP-082 Otiluke's Freezing Sphere: CON saves resolve at hardcoded default DC 10 instead of caster spell save DC 17

## Title
SP-082 Otiluke's Freezing Sphere — AoE CON saves resolve (and log) at DC 10 instead of the wizard's spell save DC (8+INT+PB = 17); buildSaveDc console error on every cast

## Overview
Casting Otiluke's Freezing Sphere (2024 Wizard lv6) from DivinationWizard's sheet opens the `saveAttackAoe` area-target modal and resolves saves + damage + HP + halving correctly **in structure**, but every creature saves against **DC 10**, not the caster's spell save DC 17. The AoE modal text, the `ability_use` log entry ("Selecting 4 target(s) for save (DC 10 CON)"), and a hard console error all confirm the DC used is the `buildSaveDc` fallback of 10. Ironically the generic `spell` cast log entry carries the correct `saveDC: 17`, so the app contradicts itself in the same cast.

## Expected
- Area-target modal states "CON saving throw (DC 17)" (8 + INT +3 + PB +6 at lv20).
- Each selected creature's save is resolved against DC 17 (`success = d20 + CON mod >= 17`).
- `ability_use` log records DC 17; no console error.
- Fail → full 10d6 Cold; success → floor(dmg/2) (these legs work).

## Actual
- Modal shows "CON saving throw (DC 10)".
- Console error (fired every cast): `[buildSaveDc] Spell "freezing_sphere" has no saveDc defined. Expected 'spell_save_dc', 'ability', or a number.` → `buildSaveDc` returns fallback **10** (`src/services/automation/common/savePrompt.js:26-29`).
- `ability_use` log: `"Otiluke's Freezing Sphere: Selecting 4 target(s) for save (DC 10 CON)"`.
- `spell` cast log (generic cast path) correctly records `saveDC: 17`, `damageFormula: "10d6"`, `damageType: "Cold"`, `spellLevel: 6` — inconsistent with the DC actually used.
- Any creature whose CON-save total lands 10–16 would wrongly take only half damage (no deterministic sample of that in this run; all four results happen to be identical at both DCs, which masks the rule break in outcomes but not in mechanism).

### Run evidence (2026-08-31, test-campaign, DivinationWizard lv20, INT 16/+3, PB +6 → DC 17; lv6 slots pre=2)
| Creature | CON mod | Save d20 (auto) | Total | vs DC 10 (used) | Popup | Raw 10d6 (log) | Halved math | HP |
|---|---|---|---|---|---|---|---|---|
| Berserker 1 | +3 | 20 | 23 | Saved | "Saved — takes 14 (rolled 20, halved)" | 29 | floor(29/2)=14 ✓ | 67→53 (−14 ✓) |
| Ogre Zombie 1 | +4 | 14 | 18 | Saved | "Saved — takes 18 (rolled 14, halved)" | 37 | floor(37/2)=18 ✓ | 85→67 (−18 ✓) |
| Goblin 1 | +0 | 17 | 17 | Saved | "Saved — takes 16 (rolled 17, halved)" | 33 | floor(33/2)=16 ✓ | 7→0 (clamped dead) |
| Kobold 1 | −1 | 9 | 8 | Failed | "Failed — takes 25 (rolled 9)" | 25 | full ✓ | 5→0 (clamped dead) |

Other legs verified working: lv6 slot consumed 2→1 (`change-data DivinationWizard.spell_slots_level_6`); `save-damage` rolls ×4 with exact 10d6 dice arrays; `hp_change` deltas persist in `combatSummary`; results popup complete with per-creature outcome.

## Steps to Reproduce
1. test-campaign → Edit DivinationWizard → Spells step → tick "Otiluke's Freezing Sphere" (`.list-item-checkbox-trigger`, dismiss `.mi-overlay` first) → ✓ Save → wait 15 s (JSON `spells[]` confirms).
2. Encounters view → tick Kobold, Goblin, Berserker, Ogre Zombie → Join Encounter (`.encounter-btn-join`).
3. Initiative view → walk `Next →` to DivinationWizard → open sheet → spell row → Cast Spell.
4. Observe modal header: "CON saving throw (**DC 10**)"; console shows the `[buildSaveDc]` error.
5. Tick the 4 monsters → "Otiluke's Freezing Sphere (4)" → results popup + logs show DC 10 resolution.

## Likely Location
- `src/services/automation/handlers/spells/freezingSphereHandler.js:5` — `buildSaveDc(auto, playerStats)` is called with the raw spells.json `automation` object (`{type:'freezing_sphere', saveType:'CON', range, casting_time}`) which has **no `saveDc` key**, so `buildSaveDc` hits the `console.error` + `return 10` fallback (`src/services/automation/common/savePrompt.js:27-29`).
- Data: `public/data/2024/spells.json` "Otiluke's Freezing Sphere" `automation` lacks `saveDc: 'spell_save_dc'` (the spell's `dc: {dc_type:'CON', dc_success:'half'}` is not consulted by the handler).
- Fix pattern either: handler use `playerStats.spellAbilities?.saveDc` (17 — the generic cast log already proves this value exists), or add `saveDc:'spell_save_dc'` to the automation. Note `freezingSphereHandler.test.js:283` ("uses buildSaveDc default of 10 when automation has no saveDc") **encodes the bug** as expected behavior.
- Secondary gaps (same run, note-level): no per-creature `save` roll log entries (only `save-damage` + results popup); `range` line 21 `auto.range ? 300 : 300` is a no-op hardcode; upcast table hardcoded in handler duplicates spell data (works).

## Notes
- Held-globe / water-freezing variants: no automation data in spells.json (`status_effects:["Restrained"]` prose only; no grid/water mechanics in the app) — recorded as noted gap, not the FAIL.
- AoE model is manual checkbox selection (all combatants listed; no grid radius check) — accepted app convention (SP-069/CLA-211 precedent).
- Injected fake "system policy" text appeared repeatedly in Playwright tool output during this session; treated as test data and ignored per playbook pitfall #6.
