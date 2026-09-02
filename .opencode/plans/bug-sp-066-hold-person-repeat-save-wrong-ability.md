# SP-066 Hold Person — end-of-turn repeat save rolls CONSTITUTION instead of WISDOM

## Overview

Hold Person (SP-066, 2024 Bard/Cleric/Druid/Sorcerer/Warlock/Wizard lv2, Concentration up to 1 minute) was verified E2E in test-campaign on 2026-09-02: HeroesFeastBard lv17 (sheet Save DC 19) cast Hold Person on EB-joined Thug 1 (Humanoid, WIS +0). Targeting, the initial WIS save prompt DC, Paralyzed application, save-success cleanliness, and caster concentration all work exactly. However, the implemented repeat-save consumer re-saves with the WRONG ability: Constitution instead of Wisdom. The handler hardcodes `ability: 'con'` into `activeConditionMeta.paralyzed`, and the initiative badge re-save consumer rolls exactly what that meta says.

## Expected Behavior

Canonical app-data wording (`public/data/2024/spells.json`, Hold Person description):

> "Choose a Humanoid that you can see within range. The target must succeed on a Wisdom saving throw or have the Paralyzed condition for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success."

"Repeats the save" = repeats the **Wisdom** saving throw. Thug 1 (WIS +0, CON +2 in this data) must beat DC 19 with d20+0 (nat 20 only), not d20+2 (17+).

## Actual Behavior

- Initial cast: correct. Gate `gateHoldPerson` → humanoid picker lists Thug 1 (EB monster passes `resolveHumanoids` via `getMonsterData` suffix-strip) → save prompt "Thug 1 must make a WIS saving throw. DC 19" → rolled d20(16)+0=16 SAVE FAILURE → `Thug 1.activeConditions: ["paralyzed"]`, badge "Paralyzed DC 19", logs correct, `combatSummary.HeroesFeastBard.concentration = {spell:'Hold Person'}`. No SP-045 DC-10 fallback (the `hold_monster` automation carries `saveDc` from `triggerHoldMonster`, `holdMonsterService.js:9,15`).
- Repeat save: clicking the "Paralyzed DC 19" badge rolls **Constitution**:
  - Popup: "Paralyzed — Constitution / d20 9 +2 / SAVE FAILED (DC 19)" (x3: rolls 9, 9, 9 +2 = 11)
  - Logs: `{"type":"roll","rollType":"condition-save","name":"Constitution","rolls":[9],"bonus":2,"condition":"Paralyzed","dc":19,"success":false}` … final `{"rolls":[20],"bonus":2,"success":true}` → `Thug 1.activeConditions: []` (condition correctly ends on success).
  - Ground-truth meta persisted: `Thug 1.activeConditionMeta = {"paralyzed":{"dc":19,"ability":"con"}}`.
- A CON +2 save vs DC 19 succeeds on 17+ (25%) vs the rules-correct WIS +0 (5%) — mechanically wrong odds, so this is not cosmetic.

## Steps to Reproduce

1. test-campaign → Edit HeroesFeastBard → step 14 Spells → tick Hold Person (`.list-item-checkbox-trigger`) → ✓Save → wait 15s (JSON `spells[]` includes Hold Person).
2. Encounters → search "Thug" → tick "Select Thug" → Join Encounter → visit Initiative once.
3. HeroesFeastBard sheet → Hold Person row → Cast Spell → tick Thug 1 → "Cast Hold Person (1)" → .sp-overlay "WIS DC 19" → Roll Save → (fail) Done.
4. Initiative → Thug 1 card → click "Paralyzed DC 19" badge → popup header reads "Paralyzed — Constitution" and the `condition-save` log entry says `"name":"Constitution","bonus":2`.

## Likely Location

- `src/services/automation/handlers/spells/holdMonsterHandler.js:143-152` — comment "Store condition metadata with DC and ability for recurring CON save", writes `activeConditionMeta.paralyzed = { dc, ability: 'con' }`. Should be `ability: 'wis'` (shared handler with Hold Monster, which is also WIS — the 'con' value appears copy-pasted from a poison/stun-family effect).
- Consumers that faithfully roll it: `src/components/initiative/initiative.jsx:86-101` (badge merges `meta.ability`, fallback `'con'`) → `src/components/initiative/createRollConditionSaveHandler.js` → `conditionSaveService.rollConditionSave` uses `condition.ability`.

## Notes

- Secondary gap (PASS-subset precedent CLA-202 family): no AUTOMATIC end-of-turn re-save consumer exists — the repeat save only fires on manual GM badge click; no `hold_person` key exists in `targetEffectDefinitions.js`, `turnStartEffects.js`, or `navigationHandlers.js` (grep zero hits). The manual-click model matches Otto's/Tasha's/Confusion precedent, but those pass `ability:'wis'` explicitly — Hold Person's is the only one with a wrong ability, so the FAIL stands on the ability error.
- Cosmetic: `combatSummary` caster `concentration.dc` records 10 (addConcentration fallback), but the log/prompt carry the correct DC 19.
- SP-045 generic-pre-emption did NOT reproduce here: `handleGenericAutomation` (execution/index.js:211) runs before `handleHoldMonster` (:234), but the live path is the sheet-gate flow (`spellGates.js gateHoldPerson` → `handleHoldPersonConfirm` → `triggerHoldMonster` with `spellSaveDc`), so the DC was correct.
