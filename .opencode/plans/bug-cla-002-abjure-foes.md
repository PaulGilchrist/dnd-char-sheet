# CLA-002 Abjure Foes - No Charisma modifier target limit enforced

## Overview

Abjure Foes (Paladin level 9, 2024 ruleset) fails to limit the number of targets to the Charisma modifier (minimum 1). The feature's automation data specifies `"bonusExpression": "CHA modifier"` but this value is never read or enforced anywhere in the code path. All creatures within 60 feet are presented as eligible targets regardless of the Paladin's Charisma score.

## Expected Behavior

Per the automations manifest and the 2024 classes.json description:

> "As a Action, expend one use of Channel Divinity. **Target creatures equal to Charisma modifier (minimum 1)** within 60 feet. Each makes Wisdom save or has Frightened condition for 1 minute or until taking damage."

When a Paladin with Charisma 16 (+3 modifier) uses Abjure Foes against 5 enemies within 60 feet:
- Only 3 targets should be available for selection (CHA mod = +3)
- If CHA is 8 (-1), minimum 1 target should be available

## Actual Behavior

When a Paladin uses Abjure Foes:
- ALL creatures within 60 feet are presented as eligible targets, regardless of Charisma modifier
- The `bonusExpression: "CHA modifier"` field from the automation data is ignored
- No target count limit is enforced at any stage of the code path

## Steps to Reproduce

1. Create a 2024 ruleset Paladin character at level 9 with Charisma 16 (+3 modifier)
2. Set up an encounter with at least 5 enemy creatures within 60 feet
3. Use the "Abjure Foes" Channel Divinity feature
4. Observe the target selection modal - all 5+ enemies will be shown as eligible targets instead of being limited to 3

## Likely Location

The bug spans multiple files in the automation pipeline:

1. **`src/services/automation/handlers/buffs/conditionHandler.js`** (lines 9-94)
   - The `handle()` function receives `action.automation` which contains `bonusExpression: "CHA modifier"`
   - Line 12-16: `autoWithDefaults` spreads automation data but never extracts `bonusExpression`
   - Line 67-93: Returns modal payload without any `maxTargets` or `targetLimit` field
   - The Charisma modifier is never read from `playerStats.abilities`

2. **`src/components/char-sheet/modals/shared/SetConditionModal.jsx`** (lines 13-264)
   - Component props do not include any `maxTargets` parameter
   - The `renderBody` function (line 172) shows all eligible targets without limiting
   - No target count constraint is applied before or during selection

3. **`src/components/char-sheet/modals/shared/AreaEffectTargetModalBase.jsx`** (lines 113-142)
   - `eligibleTargets` memo computes ALL creatures within range
   - No `maxTargets` prop is accepted or used to filter the results
   - The filtering only considers: caster exclusion, undead filter (Turn Undead), and map-based range checks

4. **`public/data/2024/classes.json`** (line 7205-7217)
   - Abjure Foes automation data includes `"bonusExpression": "CHA modifier"` which is the intended target limit source
   - This field is never consumed by any handler or modal

5. **`src/services/automation/index.js`** (line 307)
   - Routes `set_condition` type to `handleCondition` from `conditionHandler.js`
   - No pre-processing of `bonusExpression` occurs at the routing level

## Notes

- The existing test file `conditionHandler.test.js` mocks `getAbilityModifier` but never asserts it is called, and has no tests for target limiting behavior
- The `bonusExpression` field naming suggests it was intended to be used for target limits (similar to how it's used in other automations for damage expressions or bonus calculations)
- Other Channel Divinity features (e.g., Radiance of the Dawn) may have similar issues if they use target counts
- The Channel Divinity charge expenditure (line 69-71 in conditionHandler.js, decremented in SetConditionModal.jsx line 69-71) works correctly
- The Wisdom save DC calculation and Frightened condition application work correctly
- Duration parsing (1 minute = 10 rounds) works correctly (line 84-91 in conditionHandler.js)
