# Bug: FT-010 Boon Of Energy Resistance — Resistance Not Applied to Damage

## Overview

The Boon Of Energy Resistance feat (2024 rules) allows a character to choose two damage types from a list and gain resistance to them. The chosen types are correctly stored in runtime state and displayed on the character sheet ("Resistances: Fire, Lightning"), but the resistance is NOT being applied during combat damage calculation. When the character takes damage of a chosen type, full damage is dealt instead of half damage.

## Expected Behavior

When a character with Boon Of Energy Resistance has chosen "Fire" and "Lightning" as their resistance types, and takes Fire damage in combat, the damage should be halved (resistance). For example, 9 Fire damage should become 4 (floor(9/2)).

## Actual Behavior

Full damage is applied. In testing, the Fire Elemental's Burn attack dealt 9 (2d6+3) Fire damage to FT009 Test, and HP went from 164 to 155 (9 damage taken) instead of 164 to 160 (4 damage taken with resistance).

## Steps to Reproduce

1. Open "test-campaign" and select the "FT009 Test" character (2024 rules, Fighter Level 20, has Boon Of Energy Resistance feat).
2. Click "Energy Resistances" in Special Actions.
3. Select "Fire" and "Lightning" as the two resistance types. Click "Choose Resistances".
4. Confirm the character sheet shows "Resistances: Fire, Lightning".
5. Navigate to Encounters, add a "Fire Elemental" monster, save the encounter as "FT-010 Boon Energy Resistance Test", and click "Join Encounter".
6. In the Initiative screen, set the Fire Elemental 1's target to "FT009 Test".
7. Click on the Fire Elemental 1 to open its details panel.
8. Click the "+6" Burn attack button to attack FT009 Test.
9. The attack will hit (roll +6 vs AC 9). Click "Done" to apply damage.
10. Observe that full damage (9) is applied instead of half damage (4). HP goes from 164 to 155 instead of 164 to 160.

## Likely Location

1. **`src/services/rules/rulesFactory.js:226-237`** — `getPlayerStats()` reads `getChosenRuntimeValue(playerStats, 'Boon Of Energy Resistance', 'chosenTypes')` and adds the types to `playerStats.resistances`. This appears to work correctly (character sheet shows resistances).

2. **`src/services/rules/combat/applyDamage.js:148`** — `applyDamageToTarget()` reads `playerComputed?.resistances` for the creature's resistances. The issue is likely that `playerComputed` (which is `playerStats?.computedStats || playerStats`) does NOT include the resolved boon energy resistances because `computedStats` is a derived object that may not re-compute when runtime state changes.

3. **`src/services/combat/automation/automationPassives.js:271-280`** — `getDamageResistances()` only extracts from `passive_immunity` automation entries with `damageResistance` field. The Boon Of Energy Resistance automation type (`boon_of_energy_resistance`) is NOT a `passive_immunity` type, so this function won't find it. However, this is a secondary path — the primary path should use `playerComputed.resistances`.

4. **`src/services/combat/automation/automationCollector.js`** — The `boon_of_energy_resistance` automation type has no handler in `passive.js` or any other handler module, so `buildAttackInfo` returns `null` for it. This means the automation is NOT collected as a passive. The resistance is applied entirely through `rulesFactory.getPlayerStats()` adding to `playerStats.resistances`.

## Notes

- The character sheet correctly shows "Resistances: Fire, Lightning" after selecting the types, confirming the runtime state storage and display logic works.
- The popup confirmation correctly states "Fire, Lightning selected. You gain resistance to these damage types."
- The issue is specifically in the damage calculation path during combat — `playerComputed.resistances` does not include the boon energy resistance types.
- The `isResistantToDamageType()` function in `automationPassives.js` only checks `passive_immunity` entries with `damageResistance`, which won't match the boon feat.
- Both Fiendish Resilience and Boon Of Energy Resistance follow the same pattern in `rulesFactory.js` (reading from `getChosenRuntimeValue` and adding to `playerStats.resistances`), so if Fiendish Resilience works correctly in combat, the fix may be as simple as ensuring `computedStats` is properly computed after the boon types are set.
