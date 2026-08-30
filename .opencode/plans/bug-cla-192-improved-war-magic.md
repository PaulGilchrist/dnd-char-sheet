# Bug CLA-192 — Improved War Magic (Eldritch Knight lv18)

## Title
CLA-192 Improved War Magic: lv18 spell+attack replacement never fires — row triggers lv7 cantrip picker, confirms to log-only popup with no spell cast and no weapon attack

## Overview
Eldritch Knight "Improved War Magic" (EvasiveFighter lv18, 2024 ruleset, test-campaign) does not implement its rule text. Clicking the sheet's "Improved War Magic:" row opens the base lv7 **cantrip** picker; confirming produces only a log line + info popup. No 1st/2nd-level wizard spell can be chosen, no spell is actually cast (no slot spent, no damage), and no weapon attack is made or granted.

## Expected
Per rule + `public/data/2024/classes.json` (Fighter → Eldritch Knight, **level 18**, feature `automation` is an ARRAY: `[{type:"war_magic_cantrip"},{type:"war_magic_spell", maxSpellLevel:2, replacesWarMagic:true}]`): on your turn you cast one 1st- or 2nd-level Wizard spell AND make one weapon attack, replacing two attacks. Both spell and attack should resolve that turn.

## Actual
1. Sheet shows only ONE clickable "Improved War Magic:" row; clicking it opens `WarMagicCantripModal` — header "Improved War Magic", body "**Replace one attack with a Wizard cantrip**" listing only cantrips (Acid Splash…Fire Bolt…). Prepared Magic Missile (1st) is NOT offered.
2. Selecting Fire Bolt + "Replace Attack" → popup "Improved War Magic: Replaced one attack with the cantrip Fire Bolt." → Done. Campaign log got only an `ability_use` text entry.
3. No attack roll, no roll popup, no damage log; **Zombie 1 remained 15/15 HP**. No spell slot consumed (war_magic handler never spends slots).
4. Same turn produced ZERO attack events — neither the spell half nor the attack half of the feature occurred.

## Steps to Reproduce
1. test-campaign → Edit EvasiveFighter → step-7 combobox "Eldritch Knight", level 18 (fill), Spells step tick Magic Missile (`.list-item-checkbox-trigger`) → ✓ Save, wait 15s (JSON confirms subclass/level/spells). Long Rest restores slots ("All spell slots" in log).
2. Encounters → search "Zombie" → tick `input[aria-label="Select Zombie"]` → Join Encounter (Zombie 1 AC 8, HP 15).
3. Initiative → walk Next ×7 to EvasiveFighter → set card Target dropdown = "Zombie 1".
4. Open EvasiveFighter sheet → Actions → click "Improved War Magic:" → cantrip picker appears (expected: 1st/2nd-level spell picker incl. Magic Missile).
5. Pick Fire Bolt → Replace Attack → Done → log-only; no weapon attack ever happens.

## Likely Location
- `src/services/combat/automation/automationService.js:69` (`const auto = Array.isArray(feature.automation) ? feature.automation[0] : …`) — the sheet row/action build takes **automation[0]** (cantrip) and drops the `war_magic_spell` entry, explaining the manifest "Automation type: undefined" ambiguity and the cantrip picker on the improved row.
- `src/services/character/featureCategorizationUtils.js:73,94,143` — categorization dedupes actions by `name`, so even if both infos are built ("Improved War Magic" appears twice from the array expansion), the `war_magic_spell` info is discarded by `uniqBy(…, 'name')`.
- `src/services/automation/handlers/class-fighter-rogue/warMagicSpellHandler.js:61-90` (+ `warMagicCantripHandler.js:59-88`) — `confirmWarMagicSpell/Cantrip` only `addEntry` + info popup: no spell damage resolution, no slot expenditure, and **no extra weapon attack grant** (no consumer anywhere writes an attack after war-magic confirm).
- Manifest paths stale: real chain `automationRouter.js:275` → `automation/index.js:387-388` → `useCharActionsAutomation.js:58-59` → `WarMagicSpellModal/WarMagicCantripModal`.

## Notes
- Data ground truth: Improved War Magic is **lv18** here, NOT lv15 as the manifest/task states (manifest stale again — same pattern as CLA-187/CLA-191).
- Feature requires the improved row to dispatch `war_magic_spell` (or a merged picker) and then grant+roll one weapon attack against the initiative-card Target; neither exists today.
- Registered test character: EvasiveFighter now Eldritch Knight lv18, Magic Missile prepared, Shortsword equipped — reusable for any retry after fix.
- Verified 2026-08-29 via Playwright on localhost:5173.
