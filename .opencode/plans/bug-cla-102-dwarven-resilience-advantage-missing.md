# Bug: CLA-102 Dwarven Resilience — Advantage on Poisoned Saves Not Applied

## Overview
Dwarven Resilience racial feature has two parts: Poison damage resistance (working) and Advantage on saving throws to avoid/end Poisoned condition (NOT working).

## Expected Behavior
When a Dwarf makes a saving throw to avoid or end the Poisoned condition, the roll should show Advantage (2d20, take highest) due to the Dwarven Resilience feature.

## Actual Behavior
The saving throw rolls with a single d20 instead of Advantage. Log shows "rolled 2 +3 = 5" (single roll, no advantage).

## Steps to Reproduce
1. Create a 2024 Dwarf character (e.g., Ironhold_Dwarf)
2. Add a monster that deals Poison damage and applies Poisoned condition (e.g., Green Dragon Wyrmling)
3. Start combat
4. Have the monster use Poison Breath against the Dwarf
5. The Dwarf fails the save and should get the Poisoned condition
6. When the Dwarf makes a save to end Poisoned, the roll should show Advantage

## Likely Location
- `public/data/2024/races.json` — Dwarven Resilience definition with `automation.type: "conditional_advantage"`
- `src/services/combat/automation/automationModifiers.js` — handles `conditional_advantage` modifiers
- `src/services/combat/automation/automationInfoBuilder/conditional.js` — builds conditional automation info
- `src/hooks/combat/saveProcessing.js` — save processing pipeline

## Notes
- Poison damage resistance IS working correctly (damage halved)
- The `conditional_advantage` automation type exists in the race data but is not being applied during save processing
- Additional error in `applyDamage.js:256`: "currentHitPoints not found" may be blocking the Poisoned condition from being applied
