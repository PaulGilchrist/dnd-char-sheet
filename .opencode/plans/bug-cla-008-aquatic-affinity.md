# Bug: CLA-008 Aquatic Affinity - Wrath of the Sea Emanation Range Not Applied

## Overview

The Aquatic Affinity class feature (Circle of the Sea Druid level 6) grants a Swim Speed and increases the Wrath of the Sea emanation size to 10 feet. The swim speed is correctly applied, but the emanation range override is never used by the Wrath of the Sea handler.

## Expected Behavior

When a Circle of the Sea Druid with Aquatic Affinity (level 6+) uses Wrath of the Sea:
1. The character should gain a Swim Speed equal to their walking speed
2. The Wrath of the Sea emanation range should be 10 feet (instead of the base 5 feet)

## Actual Behavior

1. **Swim Speed**: Correctly applied. Character shows "30 ft., swim 30 ft." in the speed display.
2. **Emanation Range**: NOT applied. The `aquaticAffinityEmanationRange` runtime value is set to 10 in `CharSheet.jsx:173`, but the Wrath of the Sea handler (`wrathOfTheSeaHandler.js`) never reads this value. The emanation range check is only implemented in `warpingImplosionHandler.js` (Sorcerer feature) and `saveAttackHandler.js` (general save handler).

## Steps to Reproduce

1. Create a 2024 ruleset character: Human Druid (Circle of the Sea) level 6
2. Load the character sheet - verify swim speed is shown (e.g., "30 ft., swim 30 ft.")
3. Verify the `aquaticAffinityEmanationRange` runtime value is set to 10
4. Use Wrath of the Sea in combat
5. The Wrath of the Sea handler does not check the `aquaticAffinityEmanationRange` value - it applies damage directly to the current target without any emanation range validation

## Likely Location

**Root cause**: `src/services/automation/handlers/class-druid/wrathOfTheSeaHandler.js`

The handler needs to:
1. Read the `aquaticAffinityEmanationRange` runtime value (similar to `warpingImplosionHandler.js:23-27`)
2. Use the overridden range (10ft) when validating targets within the emanation
3. Display the correct range in the action description

**Related files**:
- `src/components/char-sheet/CharSheet.jsx:168-174` - Sets `aquaticAffinityEmanationRange` to 10 (correct)
- `src/services/automation/handlers/class-sorcerer/warpingImplosionHandler.js:19-28` - Reference implementation of `getEmanationRange()` function
- `src/services/automation/handlers/combat/saveAttackHandler.js:19-28` - Another reference implementation
- `public/data/2024/classes.json:4231-4249` - Wrath of the Sea automation data with `range: "5_ft"`

## Notes

- The `getEmanationRange()` helper function in `warpingImplosionHandler.js` and `saveAttackHandler.js` is nearly identical and could be extracted to a shared utility
- The aquatic affinity passive (`automation.effect: "aquatic_affinity"`) is correctly registered in the character data from `public/data/2024/classes.json:4252-4260`
- The swim speed application in `charSummaryCalc.js:343-346` works correctly: `if (aquaticAffinityPassive && swimSpeed === null) { swimSpeed = speed; }`
- The `rangeToFeet()` utility from `src/services/rules/combat/rangeValidation.js` converts range strings like "5_ft" to numeric feet values
