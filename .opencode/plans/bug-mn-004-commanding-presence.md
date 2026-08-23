# Bug: Commanding Presence (MN-004) — Superiority Die Roll Range and Missing Reaction Feature

## Overview

The Commanding Presence maneuver has two bugs: (1) the superiority die is always rolled using a d12 range (1-12) regardless of the Battle Master's actual die type, and (2) the reaction feature "Commanding Presence (Reaction)" is registered in the automation system but never rendered in the UI, making the reaction part of the maneuver completely inaccessible.

## Expected Behavior

From the manifest:
> "When you make a Charisma (Intimidation, Performance, or Persuasion) check, you can expend one Superiority Die and add the die to the roll. Additionally, if the check succeeds, you can use your Reaction to force one creature that you can see within 30 feet of you to make a Wisdom saving throw against your maneuver save DC. On a failed save, the creature has disadvantage on its next attack roll before the end of your next turn."

Specifically:
1. A level 3 Battle Master should roll a d8 for the superiority die (1-8 range).
2. The "Commanding Presence (Reaction)" feature should be visible and clickable in the character sheet's Reactions section.
3. Clicking the reaction should prompt for a target within 30 feet, expend a superiority die, and apply disadvantage to the target's next attack roll.

## Actual Behavior

### Bug 1: Wrong Die Roll Range
- **Location**: `src/components/char-sheet/DiceRollResult.handlers.js` line 174
- **Code**: `const dieResult = Math.floor(Math.random() * 12) + 1;`
- **Observed**: When testing with BulwarkFighter (level 3 Battle Master, d8 superiority die), clicking "Commanding Presence (Superiority Die)" rolled a 12, which is outside the d8 range.
- **Impact**: The superiority die value is always in range 1-12 regardless of the Fighter's level. A level 18 Battle Master should roll d12, level 10-15 should roll d10, and level 3-9 should roll d8.

### Bug 2: Reaction Feature Not Rendered
- **Location**: `src/components/char-sheet/CharReactions.jsx` (reactions list built from `playerStats.reactions` only)
- **Code**: Line 75: `let reactions = [...(playerStats.reactions || [])];`
- **Observed**: The "Commanding Presence (Reaction)" feature is registered in `playerStats.automation.reactions` (via `src/services/rules/core/maneuvers.js` lines 149-166) but is never added to the reactions list displayed in the UI.
- **Impact**: The player cannot trigger the reaction part of Commanding Presence. The Reactions section only shows "Opportunity Attack" — there is no "Commanding Presence (Reaction)" button visible.
- **Also affected**: The `executeCommandingPresenceReaction` function expects `action.automation.targetName` to be pre-set, but there's no UI mechanism to select a target before triggering the reaction. The function should either:
  - Show a modal to select a target (like other reaction maneuvers do via `resolveTarget`), or
  - Use `resolveTarget` internally to find a valid target within range.

## Steps to Reproduce

1. Open "test-campaign" and select BulwarkFighter (level 3 Human Fighter, Battle Master, 2024 rules)
2. Open Combat Superiority modal and select "Commanding Presence" as a known maneuver
3. Click on Intimidation skill to roll a skill check
4. Observe the "Commanding Presence (Superiority Die)" button appears in the dice roll popup
5. Click the button — observe the die roll shows a value in range 1-12 (e.g., 12), not 1-8 as expected for a d8
6. Navigate to the Reactions section of the character sheet
7. Observe that "Commanding Presence (Reaction)" is NOT listed — only "Opportunity Attack" appears

## Likely Location

- **Die roll bug**: `src/components/char-sheet/DiceRollResult.handlers.js` line 174 — `handleSuperiorityManeuver` uses hardcoded `Math.floor(Math.random() * 12) + 1` instead of respecting the die expression from the maneuver.
- **Reaction not rendered**: `src/components/char-sheet/CharReactions.jsx` line 75 — only uses `playerStats.reactions`, not `playerStats.automation.reactions`. The reaction feature is registered in `src/services/rules/core/maneuvers.js` lines 149-166 but never surfaced to the UI.
- **Reaction handler**: `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js` lines 415-490 — `executeCommandingPresenceReaction` expects `targetName` to be pre-set but has no modal/target selection logic.

## Notes

- The test character BulwarkFighter (level 3, Battle Master, 2024 rules) was already present in "test-campaign" with Intimidation proficiency.
- The maneuver was successfully selected via the Combat Superiority modal, confirming the maneuver selection flow works.
- The skill check part of the automation (adding superiority die to the roll) does work, but with the wrong die range.
- The reaction part is completely inaccessible due to the feature not being rendered in the UI.
- The `executeCommandingPresenceReaction` function does correctly apply the `disadvantage` condition to the target's `activeConditions` and sets up expiration for 2 turns — this logic is correct, it just can't be triggered.
