# Bug: CLA-003 Acrobatic Movement - Display Only, No Actual Movement Mechanics

## Overview

Monk level 9 Acrobatic Movement feature (2024 ruleset) is correctly defined in the data files and displayed in the UI, but the actual movement mechanics (vertical surface walking, liquid walking) are not implemented. The app only shows "acrobatic movement" text in the speed line without any functional behavior.

## Expected Behavior

Per the 2024 Monk rules and the feature description: "While not wearing armor or wielding a Shield, you can move along vertical surfaces and across liquids without falling."

The app should:
1. Display the feature (currently working)
2. Allow the character to treat vertical surfaces as walkable terrain (climb speed = walk speed)
3. Allow the character to treat liquids as walkable terrain (swim speed = walk speed)
4. These benefits should be active only when not wearing armor or wielding a shield

## Actual Behavior

The app implements only the display portion:
- Speed line shows: "55 ft., acrobatic movement" (when no armor/shield equipped)
- Special Actions section lists "Acrobatic Movement" with the correct description
- The `acrobaticMovementActive` flag in `charSummaryCalc.js` is correctly computed
- **NO actual speed modification**: climb speed and swim speed are NOT set to the character's walk speed
- **NO map/combat terrain handling**: vertical surfaces and liquids are not treated as walkable terrain

## Steps to Reproduce

1. Create a 2024 Monk character at level 9+ in "test-campaign"
2. Verify the character has no armor or shield equipped
3. Observe the speed line shows "55 ft., acrobatic movement"
4. Observe that climb speed and swim speed remain null (not equal to walk speed)
5. Observe that the map system does not treat vertical surfaces or liquids as walkable terrain for this character

## Likely Location

**Display logic (working correctly):**
- `src/components/char-sheet/char-summary/charSummaryCalc.js:334-336` - computes `acrobaticMovementActive`
- `src/components/char-sheet/char-summary/CharSummary.jsx:270` - displays "acrobatic movement" in speed line
- `src/components/char-sheet/char-summary/CharSummary-PassiveEffects.test.jsx:159-208` - tests for display

**Missing implementation:**
- `src/components/char-sheet/char-summary/charSummaryCalc.js` - needs to set `climbSpeed` and `swimSpeed` when `acrobaticMovementActive` is true (similar to how `elemental_attunement_movement` sets both speeds at line 338-342)
- Map/terrain system - needs to treat vertical surfaces and liquids as walkable terrain for characters with `acrobaticMovementActive`

**Data (working correctly):**
- `public/data/2024/classes.json:6068-6077` - feature definition with `passive_buff` effect `acrobatic_movement`

**Manifest inaccuracy:**
- `docs/automations-manifest.json` references non-existent files:
  - `src/services/combat/automation/handlers/classFeatureHandler.js` (does not exist)
  - `src/services/combat/automation/routers/classFeatureRouter.js` (does not exist)
  - `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` (does not exist)
- Actual implementation uses `automationInfoBuilder/passive.js` for the `passive_buff` handler

## Notes

- The `elemental_attunement_movement` passive (Warrior of the Elements) at `charSummaryCalc.js:338-342` provides a template: it sets both `hasFlySpeedBuff = true` and `swimSpeed = speed`. A similar pattern should be used for `acrobatic_movement` to set `climbSpeed` and `swimSpeed` to the character's walk speed.
- The feature condition check (`no_armor_no_shield`) is already implemented in the data file and correctly evaluated in `charSummaryCalc.js`.
- All 11 tests in `CharSummary-PassiveEffects.test.jsx` pass, including the 3 acrobatic_movement display tests.
