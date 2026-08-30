# Bug — CLA-207 Know Your Enemy reveals NO immunities/resistances/vulnerabilities (IRV key mismatch)

## Overview
Know Your Enemy (Fighter → Battle Master lv7, `know_enemy` bonus action) resolves the target and spends a Superiority Die correctly, but NEVER reveals the target's immunities, resistances, or vulnerabilities for any monster whose statblock stores IRV under the `immunities`/`resistances`/`vulnerabilities` keys — i.e. 466 of the 605 monsters in `public/data/monsters.json`, including the rich-IRV test candidates Shadow and Skeleton. The popup and log always say "No immunities, resistances, vulnerabilities, or condition immunities."

## Expected
As a Bonus Action (30 ft), expending 1 Superiority Die, the popup should list the target creature's Immunities, Resistances, and Vulnerabilities matching `monsters.json` (Shadow: Immunities Necrotic/Poison/Exhaustion/Frightened/Grappled/Paralyzed/Petrified/Poisoned/Prone/Restrained/Unconscious; Resistances Acid/Cold/Fire/Lightning/Thunder; Vulnerabilities Radiant).

## Actual (verified 2026-08-29, EvasiveFighter Battle Master lv18 vs EB-joined Shadow 1)
Popup:
> Know Your Enemy: Expend 1 Superiority Die to discern enemy strengths and weaknesses.
> Target: Shadow 1.
> Range: 30_ft.
> **No immunities, resistances, vulnerabilities, or condition immunities.**

Campaign log `ability_use` entry carries the identical "No immunities…" text.
Parts that DO work: row appears in Bonus Actions, dispatch runs, target resolves from the initiative-card Target dropdown ("Target: Shadow 1"), range text shows, Superiority Die consumed (`superiorityDice` null→default 4 → **3** after activation), Short Rest refills (key in `SHORT_REST_RESOURCES`, restRules-constants.js:64 → null after rest).

## Steps to Reproduce
1. test-campaign → Edit EvasiveFighter → step 7 Subclass = Battle Master → ✓Save (lv18; wait 15s, JSON confirms).
2. Short Rest → Complete Short Rest (clears stale `superiorityDice:0`; effective pool → default 4).
3. Encounters view → search "Shadow" → tick exact row → Join Encounter (`.encounter-btn-join`) → "Shadow 1" joins initiative.
4. Initiative view → EvasiveFighter card Target dropdown = "Shadow 1".
5. EvasiveFighter sheet → Bonus Actions → click "Know Your Enemy:".
6. Popup + log reveal NOTHING despite Shadow having rich IRV in monsters.json.

## Likely Location
`src/services/automation/handlers/class-fighter-rogue/knowEnemyHandler.js:66-69`:
```js
immunities: monsterData.damage_immunities || [],
resistances: monsterData.damage_resistances || [],
vulnerabilities: monsterData.damage_vulnerabilities || [],
conditionImmunities: monsterData.condition_immunities || [],
```
`getMonsterData` (src/services/npcs/monsterUtils.js:51) correctly reads the `/data/monsters.json` DB (NOT the empty-combatSummary path of bug-cla-173), but 466/605 monsters there store IRV under `immunities`/`resistances`/`vulnerabilities` (capitalized damage + condition values mixed in `immunities`). Only 118/605 (a 2024-batch, e.g. Adult Blue Dracolich) carry `damage_*` keys. In-page control probe confirmed: `getMonsterData('Shadow 1')` → `damage_*` ABSENT, `immunities/resistances/vulnerabilities` populated; `getMonsterData('Adult Blue Dracolich')` → `damage_*` populated (handler WOULD reveal for that minority).

## Notes
- Same family as **bug-cla-173** (Hunters' Lore): a consumer reading IRV key names that don't exist in monsters.json. 173's location was `encounterToInitiative.js:184` (combatSummary stub); CLA-207's is the handler's own reads against monsters.json — the handler already avoids combatSummary IRV, so the fix is a key fallback, e.g. `monsterData.damage_immunities ?? monsterData.immunities` (and note `immunities` there mixes damage + condition immunities; splitting requires the "Immune/X:" style classification or accepting the mixed list).
- Unit test `knowEnemyHandler.test.js:154-157` mocks monsters WITH `damage_*` keys, masking the mismatch — update fixture to real monsters.json shape when fixing.
- Manifest paths (classFeatureHandler/router/infoBuilder) stale; real chain: `public/data/2024/classes.json` BM lv7 → `automationRouter.js:266` (bonusActions) → `automationInfoBuilder/combatSuperiority.js:79` → `automation/index.js:385` → `knowEnemyHandler.js`. Row is clickable via `CharBonusActions.jsx:301` (`hasAutomation`), not the Special-Actions INTERACTIVE gate.
- Resource model: uses pool IS the Superiority Die count (`superiorityDice`, default max 4, spent 1/use, Short-Rest refill) — the "restore use by expending one Superiority Die" wording is collapsed into die-spend; verified working, not part of the failure.
