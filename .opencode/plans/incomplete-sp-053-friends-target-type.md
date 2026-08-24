# SP-053 Friends - Target Type Mismatch

## Overview
The Friends spell requires a Humanoid target. The Aarakocra Aeromancer in the encounter is type "Elemental", not "Humanoid", so the spell correctly rejected the target before reaching save logic.

## Expected Behavior
When Friends is cast on a Humanoid target, a WIS save prompt should appear. On fail, target has Disadvantage on attack rolls and ability checks.

## Actual Behavior
Spell cast was rejected with "No effect. Aarakocra Aeromancer 2 is not a Humanoid." No save prompt appeared.

## Steps to Reproduce
1. Cast Friends spell on Aarakocra Aeromancer (Elemental type)
2. Spell handler validates target type via `friendsService.js`
3. Target is rejected - no save prompt

## Likely Location
`src/services/rules/features/friendsService.js` - `isTargetHumanoid` check

## Notes
This is not a bug in the automation - it correctly validates target type. Setup needs a Humanoid creature (e.g., change target or add Humanoid monster) to properly test the automation.
