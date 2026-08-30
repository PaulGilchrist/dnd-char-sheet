# Bug CLA-195 — Indomitable (Fighter lv9+, 2024): save reroll never consumes a use; no log; unavailable on monster-forced saves

## Title
CLA-195 Indomitable — reroll works (+Fighter level) but use counter `indomitableUses` is never written (dead wiring), so the long-rest use limit is unenforced; no campaign log entry; `.sp-overlay` monster-forced saves offer no reroll.

## Overview
Indomitable (`public/data/2024/classes.json` Fighter base lv9/13/17, `automation.type: auto_reroll`, trigger `failed_saving_throw`, target `saving_throw`, `bonusExpression: "fighter_level"`, recharge `long_rest`) correctly surfaces a "Reroll (+18)" button on EvasiveFighter's (lv18) failed sheet saving-throw popup and the reroll itself works (new d20 + save bonus + fighter level, new roll used). But the use-consumption code path is disconnected: the incrementing handler is never invoked, so `indomitableUses` stays null forever, the button reappears for every subsequent save, and the 1/2/3-per-Long-Rest limit is never enforced. Long-rest reset (`LONG_REST_RESOURCES`) therefore has nothing to reset. Secondary gaps: the roll is never logged to the campaign log, and the monster-forced `.sp-overlay` save prompt (the primary "failed_saving_throw" trigger via the Aarakocra Aeromancer) contains no Indomitable reroll button at all.

Manifest paths are stale (no classFeatureHandler/Router/InfoBuilder exist). Real chain:
- `src/services/combat/automation/automationModifiers.js:35` → `{effect:'reroll', target:'saving_throw', bonusExpression:'fighter_level'}`
- `src/services/combat/conditions/conditionEffectsInternal.js:233` → `autoRerollForSaves=true`
- `src/components/char-sheet/CharSheet.conditionEffects.js:69-83` → bonus evaluated (`fighter_level`→18 via `automationExpressions.js:91`); gate `indomitableUses >= (lv17?3:lv13?2:1)`
- `src/components/char-sheet/CharAbilities.jsx:227` → sheet save roll context `autoReroll:true`
- `src/components/char-sheet/DiceRollResult.jsx:376-381` → `.dice-roll-reroll-btn` "Reroll (+18)"
- `src/components/char-sheet/DiceRollResult.handlers.js:27-33` → rerolls d20, calls `onReroll`
- `src/components/char-sheet/CharSheet.handlers.js:21-24` → the ONLY writer of `indomitableUses`

## Expected
Clicking "Reroll (+18)" after a failed save increments `indomitableUses`; once uses reach the per-long-rest max (3 at lv18 per app data) the reroll option is blocked until a Long Rest; each use logs to the campaign log; the option should also surface on monster-forced failed saves (`.sp-overlay`).

## Actual
1. **Use counter never increments:** after two successful rerolls, `getRuntimeValue('EvasiveFighter','indomitableUses')` = `null` (in-page module probe, post 11s debounce) and no `indomitableUses` key in `/api/campaigns/test-campaign/change-data`. Root cause: `DiceRollResult.handlers.js:32` `if (onReroll) onReroll()` — `onReroll` is undefined in the popup because:
   - `renderPopup` → `AttackResultPopup` (`CharSheet.modals.jsx:168-189`) never passes `onReroll`; popupHandlers object (`CharSheet.jsx:499-517`) has no `onReroll` entry.
   - The only wiring `onReroll={handleRerollWrapped}` (`CharSheet.jsx:544`) targets `CharAbilities`, which destructures it as `_onReroll` (`CharAbilities.jsx:15`) and never uses it.
2. **Limit unenforced / infinite uses:** third save popup still shows "Reroll (+18)" (`autoRerollForSaves` gate reads uses=0 forever). Rerolled twice in one long rest with zero consumption. `rerollUsed` state only blocks a second reroll inside the SAME popup instance.
3. **No campaign log:** log fetch after rerolls contains zero entries matching /indomitable|reroll/i (violates app rule "every automation must log").
4. **Monster-forced path gap:** Aeromancer "DC 13 Wisdom" `.mc-dice-link-save` → `.sp-overlay` SAVE FAILURE (d20 4 +5 = 9 vs DC 13) → modal shows only "Done"; no Indomitable reroll button in `SavePromptModal.jsx` (only Fanatical Focus / Disciplined Survivor / Living Legend / Guarded Mind).

## Steps to Reproduce
1. test-campaign, EvasiveFighter (2024 Fighter lv18, abilities 8). Encounter Builder → select "Aarakocra Aeromancer" → Join Encounter.
2. Initiative view → Aeromancer card Target = EvasiveFighter → click avatar → `.mc-overlay` → click "DC 13 Wisdom" (`mc-dice-link-save`) → `.sp-overlay` → Roll Save until SAVE FAILURE → Done. Observe: no reroll option on prompt, nothing afterwards.
3. EvasiveFighter sheet → abilities table → Wisdom row Save cell (`.clickable` nth 2) → save popup shows "Reroll (+18)" → click → "d20 N (reroll) +23", new total used.
4. Dismiss popup, roll Wisdom save again → "Reroll (+18)" offered again → reroll succeeds again; repeatable indefinitely.
5. In-page: `(await import('/src/hooks/runtime/useRuntimeState.js')).getRuntimeValue('EvasiveFighter','indomitableUses','test-campaign')` → `null`; change-data has no `indomitableUses` key; campaign log has no reroll/Indomitable entries.

## Likely Location
- `src/components/char-sheet/CharSheet.modals.jsx:168-189` — missing `onReroll={popupHandlers.onReroll}` (and gate by `popupHtml.autoReroll`) on the `AttackResultPopup` for save/check popups.
- `src/components/char-sheet/CharSheet.jsx:499-517` — `popupHandlers` lacks `onReroll: handleRerollWrapped`.
- `src/components/char-sheet/CharAbilities.jsx:15` — receives it as unused `_onReroll`.
- `src/components/common/SavePromptModal.jsx:619-641` — failed-save result block has no Indomitable reroll button for characters with `autoRerollForSaves` (saveBonus/total reroll with `+fighter_level`, submit via `submitSaveResult`, HP restore path).
- Add campaign-log entry in `DiceRollResult.handlers.js:27-33` / the fixed consumer (AGENTS.md automation-logging rule).

## Notes
- Implemented mechanic ADDS Fighter level to the reroll (`bonusExpression: fighter_level`, evaluated at `CharSheet.conditionEffects.js:69-71` → +18 at lv18; breakdown showed "+23" = +5 save + 18). Printed 2024 rules are a plain reroll, but app data/source is ground truth.
- App max uses: lv9=1, lv13=2, lv17=3 (`CharSheet.conditionEffects.js:79`, `handlePlayerSaveDamage.js:47`) — "blocked until Long Rest" only after max (3 at lv18); `indomitableUses` IS in `LONG_REST_RESOURCES` (`restRules-constants.js:155`) and would reset correctly if ever written.
- Sheet save popup shows "DC Unknown — no success or failure" (cosmetic, pre-existing); reroll button renders on any d20 save popup regardless of success — acceptable loose trigger but worth tightening to failures.
- Runtime + campaign log cleared via Admin after run; Aeromancer card removed (confirm dialog reported unchanged "66 HP" — no damage side effects).
