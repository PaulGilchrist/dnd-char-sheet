# INCOMPLETE: MN-007 Evasive Footwork Verification

## Overview

Attempted to verify the Evasive Footwork automation (MN-007) against the running D&D Character Sheet app. The verification could not be completed due to multiple blockers: spec inaccuracies and UI maneuver selection issues.

## What Was Accomplished

1. **Source code analysis completed** - Read all relevant files:
   - `public/data/2024/maneuvers.json` - Evasive Footwork definition
   - `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js` - `executeBonusActionManeuver()`
   - `src/services/automation/handlers/class-fighter-rogue/dispatchers.js` - `handleCombatSuperiorityBonusAction()`
   - `src/services/automation/handlers/class-fighter-rogue/combatSuperiorityUtils.js` - `rollManeuverDie()`, `expendSuperiorityDie()`
   - `src/services/rules/core/maneuvers.js` - `processManeuvers()`
   - Multiple test files for combat superiority handlers

2. **Character created** - Successfully created a 2024 Fighter (Battle Master, Level 5) named "EvasiveFighter" in test-campaign with 4/4 Superiority Dice (d8).

3. **Code logic verified correct** - The Evasive Footwork handler correctly:
   - Checks for superiority dice availability
   - Rolls the superiority die
   - Expend the die
   - Sets `baitAndSwitchActive=true`, `baitAndSwitchBonus=<roll>`, `baitAndSwitchSource="Evasive Footwork"`
   - Adds expiration with `bait_and_switch_clear` type
   - Returns a popup: "You take the Disengage action and gain +{roll} AC until the start of your next turn."

## Where It Stalled

### Blocker 1: Spec Has Incorrect File Paths
The spec references files that do not exist:
- `src/services/combat/automation/handlers/maneuverHandler.js` - DOES NOT EXIST
- `src/services/combat/automation/routers/maneuverRouter.js` - DOES NOT EXIST
- `src/services/combat/automation/infoBuilders/maneuverInfoBuilder.js` - DOES NOT EXIST

Actual locations:
- Handler: `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js`
- Router/Dispatcher: `src/services/automation/handlers/class-fighter-rogue/dispatchers.js`

### Blocker 2: Spec Has Incorrect Expected Behavior
The spec describes **Bait and Switch**, not Evasive Footwork:

**Spec says:** "switch places with that creature... spend at least 5 feet of movement... creature is willing... doesn't provoke Opportunity Attacks"

**2024 ruleset Evasive Footwork actually says:** "As a Bonus Action, you can expend one Superiority Die and take the Disengage action. Roll the die and add the number rolled to your AC until the start of your next turn."

The position-swap behavior is implemented as a separate maneuver called "Bait and Switch" in the 2024 ruleset (`actionType: "movement"`, `effect: "ac_bonus_and_swap"`).

### Blocker 3: UI Maneuver Selection Not Working
After creating the character, the Evasive Footwork maneuver does not appear in the Bonus Actions section despite setting `BattleMasterManeuvers_selection` via the runtime store.

Root cause: The `processManeuvers()` function (in `src/services/rules/core/maneuvers.js`) is called during initial player stats computation and caches results. Changing `BattleMasterManeuvers_selection` after character load does not trigger a re-computation of player stats. Attempts to force re-computation via Short Rest and character re-navigation did not work.

The character creation wizard also has no maneuver selection step for Battle Master subclass.

## What Would Unblock This

1. **Fix the spec** to match the actual 2024 ruleset description of Evasive Footwork (Disengage + AC bonus), or update it to target Bait and Switch if the position-swap behavior is intended.

2. **Fix maneuver selection UI** - Either:
   - Add a maneuver selection step to the character creation/edit wizard for Battle Master characters, OR
   - Make `processManeuvers()` re-run when `BattleMasterManeuvers_selection` changes (e.g., trigger on rest, or on runtime store change), OR
   - Provide a direct UI button to select maneuvers that properly triggers re-computation

3. **Once maneuvers appear in Bonus Actions**, the test flow would be:
   - Click Evasive Footwork in Bonus Actions
   - Verify popup shows: "You take the Disengage action and gain +{roll} AC until the start of your next turn"
   - Verify Superiority Dice count decreased by 1
   - Verify `baitAndSwitchActive` is true and `baitAndSwitchBonus` equals the die roll
   - Verify expiration is set with `bait_and_switch_clear` type

## Notes

- The 2024 ruleset Evasive Footwork (`ac_bonus_disengage`) and Bait and Switch (`ac_bonus_and_swap`) are separate maneuvers with different `actionType` values (`bonus_action` vs `movement`).
- The spec trigger conditions (`Action type: bonus_action; Uses: superiority_die`) match Evasive Footwork's actual definition.
- The spec expected behavior description matches Bait and Switch's actual definition.
- This appears to be a spec error where the description was copied from the wrong maneuver.
