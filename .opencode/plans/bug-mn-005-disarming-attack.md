# Bug: Disarming Attack Maneuver Crashes with "onUse is not a function"

## Overview

When a Battle Master Fighter uses Disarming Attack (or any attack rider maneuver) after hitting a target, clicking "Use Maneuver" causes a JavaScript error: `TypeError: onUse is not a function`. The maneuver never executes, no superiority die is expended, no save is prompted, and no log entry is created.

## Expected Behavior

1. After a weapon attack hits, the Attack Rider Maneuver modal appears with available maneuvers.
2. Selecting Disarming Attack and clicking "Use Maneuver" should:
   - Expend one Superiority Die
   - Add the die value to the attack's damage
   - Prompt the target to make a STR saving throw
   - Apply the disarm effect (target drops held object) on a failed save
   - Log the maneuver usage to the campaign log

## Actual Behavior

1. The Attack Rider Maneuver modal appears correctly.
2. Selecting Disarming Attack and clicking "Use Maneuver" throws: `TypeError: onUse is not a function`
3. The modal remains open, no die is expended, no save is triggered, no damage is modified, and no log entry is created.

## Steps to Reproduce

1. Create a 2024 Fighter (Battle Master) level 5+ character in a campaign.
2. Add an NPC enemy (e.g., "Test Goblin") to initiative.
3. Enter combat, select the Fighter as active character.
4. Set target to the NPC enemy.
5. Click an attack action (e.g., Unarmed Strike) to attack the target.
6. When the attack hits, the "Battle Master — Attack Rider Maneuver" modal appears.
7. Select "Disarming Attack" from the radio options.
8. Click "Use Maneuver".
9. Observe the JavaScript error in the console and the modal remaining open.

## Likely Location

**Root cause:** `useCharActionModals.js` does not return `handleAttackRiderManeuverUse` and `handleAttackRiderManeuverSkip` from `useAttackDamageResolution.js`.

- `src/components/char-sheet/useCharActionModals.js` (lines 22-27): Destructures only `resolveAttackDamage` and `proceedWithDamage` from `useAttackDamageResolution`, but NOT `handleAttackRiderManeuverUse`, `handleAttackRiderManeuverSkip`, or `handleAttackRiderOptionSelect`.
- `src/components/char-sheet/useCharActionModals.js` (lines 62-91): The return statement does not include these handlers.
- `src/components/char-sheet/CharActions.jsx` (lines 128-129): Destructures `handleAttackRiderManeuverUse` and `handleAttackRiderManeuverSkip` from `useCharActionModals`, receiving `undefined`.
- `src/components/char-sheet/CharActionModals.SecondaryModals.jsx` (lines 435-436): Passes `undefined` as `onUse` and `onSkip` props to `AttackRiderManeuverPrompt`.
- `src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx` (line 12): `handleUse` calls `onUse(...)` where `onUse` is `undefined`.

**Fix:** Add `handleAttackRiderManeuverUse`, `handleAttackRiderManeuverSkip`, and `handleAttackRiderOptionSelect` to the destructuring from `useAttackDamageResolution` in `useCharActionModals.js`, and include them in the return statement.

## Notes

- The same bug affects ALL attack rider maneuvers (Trip Attack, Pushing Attack, Goading Attack, Menacing Attack, Distracting Strike, Maneuvering Attack, Precision Attack, Sweeping Attack) and not just Disarming Attack.
- The bug affects both hit and miss scenarios (Precision Attack on miss would also crash).
- The existing unit tests mock `useCharActionModals` with these handlers, so they pass, but the real implementation is missing the return values.
