# SP-001 Ambush: Superiority Die Bonus Not Applied to Skill Checks

## Overview

The Ambush maneuver (SP-001) allows a Fighter to expend a Superiority Die and add it to a Dexterity (Stealth) check or Initiative roll. The die is correctly rolled and expended, but the bonus is never actually applied to the final roll result.

## Expected Behavior

When you make a Dexterity (Stealth) check or an Initiative roll, you can expend one Superiority Die and add the die to the roll, unless you are Incapacitated.

## Actual Behavior

1. Superiority die is rolled correctly
2. Die is expended from the pool correctly
3. Popup appears: "Add [X] to your next Initiative roll or Dexterity (Stealth) check"
4. Player clicks Stealth/Initiative
5. Roll happens but the bonus is NOT applied to the final result

The `pendingSkillCheckBonus` value is stored in the character's runtime store but never read anywhere in the dice roll pipeline. It is only ever `set`, never `get`.

## Steps to Reproduce

1. In "test-campaign", create or use a 2024 Fighter (Battle Master, level 3+)
2. Start combat with an enemy
3. On your turn, click the Stealth skill in the character sheet
4. When prompted, choose to use Ambush (expend Superiority Die)
5. Confirm the die is rolled and the popup appears
6. Click Stealth to apply the bonus
7. Observe the final roll result — the Superiority Die bonus is missing

## Likely Location

- `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js:261` — `executeSkillCheckManeuver` stores `pendingSkillCheckBonus` but it's never consumed
- `src/hooks/combat/d20RollComputation.js:32-44` — `computeD20Roll` reads `cosmicOmenPendingBonus` but not `pendingSkillCheckBonus` (similar pattern, working implementation)

The fix should read `pendingSkillCheckBonus` from the character's runtime store in `computeD20Roll` (or `logAndShow`) for `check`/`skill`/`initiative` roll types and add it to the effective bonus, then consume (clear) the value after application.

## Notes

- The manifest references `maneuverHandler.js`, `maneuverRouter.js`, and `maneuverInfoBuilder.js` which do not exist. The actual implementation uses `automationRouter.js`, `automationInfoBuilder/combatSuperiority.js`, and `core/maneuvers.js`.
- The `cosmicOmenPendingBonus` pattern in `computeD20Roll` is the correct reference implementation for how this should work.
