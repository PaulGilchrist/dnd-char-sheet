# BUG CLA-237 — Nature's Ward lightning resistance never applies to incoming damage

## Title
CLA-237 Nature's Ward: Poisoned immunity works, but land-choice damage resistance is absent from the damage pipeline — full lightning damage applied to Temperate Circle of the Land druid.

## Overview
Wild_Sage_Druid (2024 Druid lv20 Circle of the Land, land = Temperate) takes FULL lightning damage from a monster attack. The sheet correctly displays "Resistances: Lightning" + "Immunities: Poisoned" and the Poisoned condition immunity works end-to-end, but the damage halving never fires in combat because the land→resistance mapping is only injected into the CharSheet-local playerStats — never into the app-level `computedCharacters` that the initiative damage path feeds into `applyDamageToTarget`.

## Expected
- Immune to Poisoned condition (2024 classes.json Druid → Circle of the Land lv10 `land_resistance`, `conditionImmunity:'poisoned'`).
- Resistance to land damage type (Temperate = Lightning): incoming lightning damage halved, applied = floor(raw/2).

## Actual
- (PASS) Poisoned immunity: initiative-card Add→Conditions→Poisoned→Apply on druid → silent refusal; change-data `Wild_Sage_Druid.activeConditions` stays `[]`, no badge. Control KeenElf same Add → `['poisoned']` + "Poisoned DC 10" badge stuck (immunity is druid-specific).
- (PASS, display only) Druid sheet summary shows "Resistances: Lightning" (Temperate) and flips to "Resistances: Fire" when land switched to Arid via CircleOfTheLandSpellsModal, flips back to Lightning when restored to Temperate. `_circleOfTheLandType` runtime persists (Temperate LEFT SET).
- (FAIL) Modron Pentadrone 1 Electrical Discharge (+4, 1d6+2 Lightning) hit Wild_Sage_Druid: raw roll 7 (`1d6(5)+2`), applied **7** — "HP: 143 → 136", log `hp_change delta:-7`. Expected floor(7/2)=3. `campaign.lastAttack` confirms `damageTypes:['Lightning']`, rawDamage 7, full application. Control: same attack vs KeenElf raw 5 → applied 5 (9→4) — pipeline itself lands damage fine; there is simply no resistance applied to the druid and no "reduced from" line / resistance notice in the popup.

## Steps to Reproduce
1. test-campaign, localhost:5173. Druid sheet → "Circle of the Land Spells:" → click "Temperate" (land is nulled by every Long Rest, restRules-longRest.js:330 — re-set it; note land type was null at session start this run).
2. Reload; druid sheet summary confirms "Resistances: Lightning" + "Immunities: Poisoned".
3. Encounter Builder → tick "Modron Pentadrone" → Join Encounter.
4. Initiative view → Modron card Target dropdown = Wild_Sage_Druid → click avatar (.mc-overlay) → Electrical Discharge attack dice link until HIT → Done.
5. Damage popup shows "1d6 + 2: X +2 / N damage applied — HP 143 → 136" — FULL raw damage, no halving, no resistance notice.
6. Poison half for contrast: druid card Add→Conditions→Poisoned→Apply → refused (activeConditions stays []); KeenElf same → sticks.

## Likely Location
- **App.jsx:114-122** (`computedCharacters` build): calls `rulesFactory.getPlayerStats(...character)` on the RAW character JSON — does NOT inject runtime `_circleOfTheLandType` into `class.subclass.type`. This enriched list is what `<Initiative characters={computedCharacters}>` (App.jsx:540) and the monster attack → `rollDamage`/`applyDamageToTarget` path consume.
- **rulesFactory.js:152-179**: `land_resistance` resolution reads only `playerStats.class.major?.type || classData.subclass?.type` (null in character JSON) → mappings miss → `resistances` stays `[]`. It never reads runtime `_circleOfTheLandType` itself (unlike sibling branches for Stormborn :110 / Full of Stars :116 which DO read runtime).
- CharSheet.jsx:101-117 injects the land type but only into its own sheet-local stats (display + sheet half) — never written back to App computedCharacters (App memo at :108 keys on character JSON serial only, runtime land-type changes don't recompute).
- Secondary: `automationPassives.getDamageResistances` (automationPassives.js:273-288, the applyDamage.js:151-157 fallback merge) has NO `land_resistance` branch — second would-be consumer also blind.
- Secondary: MonsterCardModal.jsx:226-235 `resistanceNotice` reads target computedStats from `creatures` (combatSummary player stub has no computedStats/resistances) → attack popup never warns of resistance either.

In-page isolation probes (dev dynamic import, real modules):
- App-style compute: `getPlayerStats(classes2024, equipment, magicItems2024, races2024, spells2024, charJson)` → `resistances: []`, `immunities: ['poisoned']` → `computeDamageAfterResistances(7,['Lightning'],[])` = 7 (matches live full damage).
- CharSheet-style compute (subclass.type='Temperate' injected) → `resistances: ['Lightning']` → `computeDamageAfterResistances(7,['Lightning'],['Lightning'],…)` = 3 exact, Fire unaffected = 7. Halving math + landMappings data are CORRECT; the failure is purely that no damage-path caller ever receives land-injected resistances.

## Notes
- Immunity half lives in automationImmunities.js:101 (`playerIsImmunityToCondition` land_resistance branch) and reads `auto.conditionImmunity` directly (land-independent) — which is why the Poisoned refusal passes while resistance fails.
- Manifest handler/router/infoBuilder paths (`classFeatureHandler/router/infoBuilder`) do not exist — stale, same as CLA-235.
- Land-switch UI EXISTS (CircleOfTheLandSpellsModal writes `_circleOfTheLandType`); display flips Arid=Fire ⇄ Temperate=Lightning, but damage stays unhalved in BOTH states — consistent with the wiring bug, not land data.
- CLA-235 Nature's Sanctuary observed `naturesSanctuaryResistance:"Lightning"` because naturesSanctuaryHandler.js:48-49 duplicates the landMappings table inline and reads the runtime key directly — Nature's Ward itself has no equivalent runtime-reading consumer on the damage path.
- Suggested fix: mirror the Stormborn/Full-of-Stars pattern in rulesFactory.js — read runtime `_circleOfTheLandType` in the land_resistance branch (fall back to classData type), so EVERY getPlayerStats caller (App computedCharacters included) resolves land resistance; add `land_resistance` to automationPassives.getDamageResistances as belt-and-braces.
- Test leftovers cleaned: Modron removed, change-data + campaign log cleared, `_circleOfTheLandType` LEFT = Temperate (registry note); druid HP/runtime restored by Admin clear.
