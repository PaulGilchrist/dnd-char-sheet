# Bug CLA-209 — Large Form / Powerful Build (Goliath): no advantage on grapple-escape ability check

## Title
CLA-209 Large Form – Goliath (Passive): Grappled-escape ability check rolls with NO advantage

## Overview
The Goliath race's grapple-escape advantage (manifest "Large Form", modelled in 2024 `races.json` as the base **Powerful Build** trait `automation:{type:'conditional_advantage', target:'ability_check', condition:'grappled', effect:'advantage'}`) is never applied. The escape surface exists (initiative-card Add → "Grappled DC 13" → clickable badge on the sheet) but the escape roll always uses a single d20 (`mode:"normal"`).

## Expected
Escape-the-Grappled ability check rolls TWO d20 (`mode:"advantage"`, popup shows both dice, higher used), per Powerful Build / CLA-209 expected behavior.

## Actual
Both escape rolls were single-d20:
- Popup: `Strength (DC 13) | 4 | d20 2 +2 | ✗ SAVE FAILURE (4 vs DC 13) (d20 2 + 2)`
- Popup (2nd roll): `Strength (DC 13) | 22 | d20 20 +2 | NATURAL 20! | ✓ SAVE SUCCESS (22 vs DC 13) (d20 20 + 2)` (success came from nat-20 luck, not advantage)
- Log entries: `{"rollType":"save","name":"Strength (Grappled)","rolls":[2],"mode":"normal"}` and `{"rollType":"condition-save","rolls":[2],"mode":"normal","dc":13}`

Runtime isolation probe (`rules.getPlayerStats` on the real character JSON) proves the modifier pipeline is broken:
- `hasPowerfulBuild: true`, `sizeMultiplier: 2` ✓ (carrying-capacity half IS computed — no UI readout, only trait description text on sheet; treated as non-combat flavor).
- `saveModifiers` contains only the raw data-parsed shape `{source:'Powerful Build', target:'ability_check', condition:'grappled', effect:'advantage', abilities:[], skills:[]}` — the escape consumers never match it.

## Steps to Reproduce
1. Character **GoliathFireGiant** (2024 Goliath / Fire Giant subrace, lv5 Fighter, `public/campaigns/test-campaign/GoliathFireGiant.json` — re-created 2026-08-29; old registry file was missing).
2. Initiative view (new PCs auto-merge into combatSummary) → GoliathFireGiant card → **Add** → tab Conditions → select **Grappled**, DC **13**, Save **Strength** → Apply (change-data: `activeConditions:["grappled"]`, `activeConditionMeta.grappled={dc:13,ability:"str"}` ✓).
3. Open character sheet → clickable badge **"Grappled DC 13"** (`creature-badge effect-condition`) → click it.
4. Popup + log show single d20, `mode:"normal"` — no advantage, twice.

## Likely Location
- `src/services/rules/rules.js` — `getPlayerStats` (starts :103). :172 collects saveModifiers, :174-181 pushes the fix-up modifier `{source:'Powerful Build', condition:'powerful_build_grapple_escape', effect:'advantage', abilities:['STR']}`, but **:458 re-assigns `playerStats.saveModifiers = collectSaveModifiers(allFeatures)` later in the same function, clobbering the pushed entry**. The push must be repeated after :458 (or the collector itself must emit the canonical shape).
- Consumer predicates require `mod.condition === 'powerful_build_grapple_escape' && mod.abilities?.includes('STR')`: `src/components/char-sheet/char-summary/CharConditions.jsx:96-105` (the escape badge roll) and `src/services/combat/conditions/conditionSaveService.js:62-64` (NPC path). The surviving parsed modifier has `condition:'grappled'`, `abilities:[]` → no match.
- Secondary gap: `src/components/char-sheet/CharSheet.conditionEffects.js:63` calls `computeConditionEffects(...)` without the `hasPowerfulBuild` argument (arg 18 defaults false), so `saveModifierApplies`' `powerful_build_grapple_escape` branch (`conditionEffectsInternal.js:115`) can never pass from that path either.

## Notes
- Escape-condition lifecycle itself works: success cleared `activeConditions:[]`.
- Carrying-capacity half: `sizeMultiplier=2` computed by `raceTraits.applyPowerfulBuild` and used by `getCarryingCapacity`, but no numeric readout surfaced on sheet (trait text only) — non-combat flavor, not the FAIL driver.
- "Large Form" itself (`large_form`, lv5 Fire-Giant-lineage bonus-action transform) has its own handler `src/services/automation/handlers/class-other/largeFormHandler.js`; manifest handler/router/infoBuilder paths (`combat/automation/handlers/classFeatureHandler.js` etc.) do not exist.
- Test-campaign left clean after run (change-data + log cleared via Admin); GoliathFireGiant JSON kept as the reusable Goliath test char.

Verified 2026-08-29 by CLA-209 subagent.
