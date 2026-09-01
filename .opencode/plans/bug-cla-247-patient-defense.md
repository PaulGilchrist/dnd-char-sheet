# Bug — CLA-247 Patient Defense (Monk, 2024)

## Title
CLA-247 Patient Defense spends 2 Focus Points per use and the plain "Disengage only" mode is unreachable

## Overview
Verified E2E on Disciplined_Monk (lv17 Warrior of the Open Hand, 2024) at http://localhost:5173, campaign "test-campaign". At lv17 the base "Patient Defense:" row is replaced by "Heightened Patient Defense:" (same `patient_defense` automation; `classRules2024.js:150` replacedByHeightened). Clicking the row consumes TWO Focus Points instead of ONE, and there is no mode picker to take the plain Disengage option — the RAW "Disengage as a Bonus Action" half (and the handler's zero-FP fallback) can never be exercised.

## Expected Behavior
Trigger: `after_attack_action`, 1 bonus action. Take Disengage as a Bonus Action, OR expend exactly 1 Focus Point for Disengage + Dodge.

## Actual Behavior
- Focus mode (Mode B, focus available): ONE click spent 2 FP — runtime `Disciplined_Monk.focusPoints` 17 → 15 (change-data + live `getRuntimeValue` probe). Popup: "Disciplined_Monk used Heightened Patient Defense: Disengage and Dodge as a bonus action. Gained 5 temporary hit points (2 × 12-sided die). **(15 Focus Points remaining)**." Dodge half works: `activeBuffs[{name:'Dodge',effect:'dodge',duration:'until_start_of_next_turn'}]`, `pendingExpirations[{remove_active_buff Dodge, expireOnCreatureName:Disciplined_Monk}]`, sheet badge "Dodge — Disadv on attacks vs you, Adv on DEX saves", `tempHp:5`, `ability_use` log written.
- Plain mode (Mode A): NO option picker exists — the row click goes straight to the handler, which auto-consumes Focus whenever `currentFocus >= cost` (`patientDefenseHandler.js:15`). With Focus set to 0 via the sheet tracker, the click is BLOCKED by the sheet's monk-Ki gate with popup "No Focus Points remaining." (`useCharActionsAutomation.js:176-179` returns before `executeHandler`) — so plain Disengage (the handler's else-branch at `:65-83`) is DEAD CODE via this surface.
- Bonus action "consumption" has no tracker marker (app convention, CLA-159 precedent); the FP spend + log are the evidence.

## Steps
1. Open Disciplined_Monk sheet; Bonus Actions shows "Heightened Patient Defense:"; Focus 17/17 (`change-data.focusPoints:17`).
2. Click "Heightened Patient Defense:" once → popup shows Disengage+Dodge+temp HP but "(15 Focus Points remaining)"; ≥13 s change-data probe: `focusPoints:15` (2 consumed), Dodge buff/expiration present.
3. Click the "Focus Points:" tracker, set to 0 (UI tracker) → "Focus Points: 0/17".
4. Click "Heightened Patient Defense:" → block popup "No Focus Points remaining." — plain Disengage never applies; no picker ever offered at FP>0 either.

## Likely Location
- `src/components/char-sheet/useCharActionsAutomation.js:167-182` — MONK_KI_FEATURES pre-spend of 1 FP includes 'Patient Defense'/'Heightened Patient Defense' AND the `currentFP <= 0` early-return that kills the plain-Disengage fallback.
- `src/services/automation/handlers/combat/patientDefenseHandler.js:11-16` — handler spends a SECOND 1 FP (`focusPoints` read again post-sheet-spend). One of the two must not spend; and a mode choice (or a 0-FP pass-through) is needed for the plain Disengage half.

## Notes
- Consumer side of Dodge verified as modelled: `targetEffectDefinitions.js:97` `dodge` = "Disadvantage on attacks"; sheet badge renders; no enemy attacks staged (core verification per dispatch is modes + Focus math).
- Base "Patient Defense:" row absent at lv17 by design (replacedByHeightened); PASS bar applied to the Heightened row as the live `patient_defense` surface.
- 1-click double spend makes the popup's own "(15 remaining)" text self-inconsistent with the expected single-spend arithmetic (17−1=16).
