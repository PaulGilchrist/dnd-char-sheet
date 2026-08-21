# FT-002 Actor - "disguised" condition has no UI toggle or tracking mechanism

## Overview

The Actor feat (2024 ruleset) defines automation with `condition: "disguised"` to grant advantage on Charisma (Deception or Performance) checks while disguised. However, there is no mechanism in the application to set or track a "disguised" state on a character, meaning the feat's conditional advantage can never activate.

## Expected Behavior

When a character with the Actor feat makes a Deception or Performance check, the app should:
1. Check if the character is "disguised"
2. If disguised, apply advantage to the check

The "disguised" state should be toggleable via the UI (e.g., as a target effect or condition badge).

## Actual Behavior

The Actor feat's conditional advantage never triggers because:

1. **No "disguised" condition exists** - The string `"disguised"` is referenced only in the feat's automation data (`public/data/2024/feats.json` line 60) and in one test (`conditionEffectsCompute.test.js` line 655). It does NOT appear anywhere in the target effect definitions, condition tracking, or UI.

2. **No UI to toggle "disguised"** - There is no checkbox, button, or target effect entry for "disguised" in `src/services/combat/conditions/targetEffectDefinitions.js`.

3. **Condition check always fails** - In `src/services/combat/conditions/conditionEffectsInternal.js:119`:
   ```javascript
   if (modifier.condition && conditionSet.has(modifier.condition)) return true;
   ```
   Since "disguised" is never in the `conditions` array passed to `computeConditionEffects()`, `conditionSet.has('disguised')` always returns `false`, and `saveModifierApplies()` returns `false`, preventing the modifier from being applied.

4. **`abilityCheckAdvantageSkills` is never populated** - Because the condition check fails, the code at lines 161-169 that would add 'Deception' and 'Performance' to `abilityCheckAdvantageSkills` is never reached.

## Steps to Reproduce

1. Create a new 2024 ruleset character (e.g., Human Fighter level 4)
2. Add the Actor feat at step 8 (Feats)
3. Save the character and view it
4. The Actor feat appears in the character's features list
5. Attempt to make a Deception or Performance skill check
6. Observe that advantage is NOT applied (because there's no way to set the "disguised" state)

## Likely Location

The root cause is a **data/code mismatch**:

1. **`public/data/2024/feats.json:57-64`** - The Actor feat defines:
   ```json
   "automation": {
     "type": "conditional_advantage",
     "target": "deception_performance_checks",
     "condition": "disguised",
     "effect": "advantage",
     "ability": "Charisma"
   }
   ```

2. **`src/services/combat/conditions/targetEffectDefinitions.js`** - Missing a "Disguised" target effect entry. This is where ALL toggleable effects must be registered.

3. **`src/services/combat/conditions/conditionEffectsInternal.js:119`** - The condition check that gates whether the modifier applies.

4. **`src/services/combat/automation/automationModifiers.js:9-18`** - Correctly extracts `conditional_advantage` modifiers from features.

5. **`src/services/combat/conditions/conditionEffectsInternal.js:161-169`** - Correctly handles `deception_performance_checks` target to populate `abilityCheckAdvantageSkills`.

The fix requires either:
- Adding a "Disguised" target effect to `targetEffectDefinitions.js` so GMs can toggle it, OR
- Changing the Actor feat's automation to not require a condition (always apply), OR
- Adding a UI toggle for the "disguised" state on the character sheet

## Notes

- The 5e Actor feat (`public/data/feats.json:13-22`) has the same `condition: "disguised"` requirement with identical issue.
- The existing test in `conditionEffectsCompute.test.js:653-658` tests `deception_performance_checks` with `disguised` condition but passes an empty conditions array `[]`, meaning the test doesn't actually verify the condition gating works correctly.
- The skill check UI in `CharAbilities.jsx:128-129` correctly checks `abilityCheckAdvantageSkills` against the check name, so once the condition is properly set, the advantage would be applied.
