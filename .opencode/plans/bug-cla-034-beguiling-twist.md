# Bug: CLA-034 Beguiling Twist - Reaction Modal Does Not Trigger

## Overview

The Ranger's Beguiling Twist class feature does not trigger its Reaction modal when a creature within 120 feet succeeds on a save vs Charmed or Frightened. The passive advantage on saves vs Charmed/Frightened works correctly, but the reaction to redirect the effect fails silently.

## Expected Behavior

When the Ranger or a creature within 120 feet succeeds on a save vs Charmed or Frightened, the Ranger should be able to take a Reaction to force a different creature within 120 feet to make a Wisdom save (Ranger's spell save DC) or be Charmed/Frightened for 1 minute.

## Actual Behavior

The Beguiling Twist reaction modal does not appear. The save is processed correctly (advantage is applied, save succeeds), but the reaction check `findTriggeringSaveOrCondition` returns `null` because `lastAttack.saveConditions` is empty.

## Root Cause

The `charmPersonHandler` passes `condition: 'charmed'` to `createSaveListener`, but `saveProcessing.js` reads `context?.saveConditions` (not `condition`) when setting `lastAttack.saveConditions`. Since `charmPersonHandler` doesn't pass `saveConditions` in the context, `lastAttack.saveConditions` defaults to `[]`, causing `findTriggeringSaveOrCondition` to return `null`.

## Steps to Reproduce

1. In "test-campaign", create a 2024 Ranger character with Beguiling Twist feature
2. Create a second creature (e.g., Fey Warlock) that casts Charm Person on the Ranger
3. The Ranger makes a WIS save vs Charmed — save succeeds with advantage (passive works)
4. Observe: Beguiling Twist reaction modal does NOT trigger to redirect the charm to another creature

## Likely Location

- `src/services/automation/handlers/spells/charmPersonHandler.js:95-104` — Creates save listener with `condition: 'charmed'` but no `saveConditions`
- `src/hooks/combat/saveProcessing.js:76,218` — Reads `context?.saveConditions` to set `lastAttack.saveConditions`
- `src/services/automation/handlers/class-ranger/beguilingTwistHandler.js:20-29` — Checks `saveConditions` and `saveType` for match

## Notes

The fix is one of:
1. `charmPersonHandler.js` needs to pass `saveConditions: ['charmed']` in the context
2. OR `saveProcessing.js` needs to read the `condition` from `pendingSavePrompts` to populate `saveConditions`

This likely affects ALL class features that depend on `lastAttack.saveConditions` matching a condition — not just Beguiling Twist, but any feature that triggers on a creature succeeding on a save vs a condition that was applied via a spell save.
