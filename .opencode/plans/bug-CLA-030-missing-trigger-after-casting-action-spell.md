# Bug: CLA-030 - Battle Magic (Bonus Action Attack After Action Spell)

## Overview

Battle Magic is a Level 14 College of Valor Bard feature (2024 ruleset) that should allow the character to make one weapon attack as a Bonus Action after casting a spell with a casting time of an action. The automation is defined in the data file but the trigger `after_casting_action_spell` is never processed anywhere in the codebase.

## Expected Behavior

After a Level 14 College of Valor Bard casts a spell with casting time "action" (e.g., *burning hands*, *shield*), the character should be offered a Bonus Action to make one weapon attack. This bonus action attack should:

1. Appear in the bonus actions list after the spell is cast
2. Allow the player to make a weapon attack roll using their normal attack bonus
3. Deal the weapon's normal damage
4. Be available only after casting an action spell (not cantrips with bonus action casting time)

## Actual Behavior

The Battle Magic automation never fires. When a Level 14 College of Valor Bard casts an action spell:

1. No bonus action attack is offered
2. The `bonus_action_attack` automation for Battle Magic is collected into the `bonusActions` array (via the router)
3. However, the trigger `after_casting_action_spell` is never emitted by any pipeline step
4. The `bonusActionAttackHandler.js` only handles `after_attack_action_with_polearm` trigger - everything else falls through to `automationInfoPopup(action)` which just shows an info popup

## Steps to Reproduce

1. Create a 2024 College of Valor Bard at level 14 in "test-campaign"
2. Give the character a weapon (e.g., longsword) and a spell with casting time "action" (e.g., *burning hands*)
3. Start a combat and add an enemy target
4. Cast the spell using the action spell button
5. Observe that no bonus action attack option appears after the spell resolves

## Likely Location

The bug spans multiple files in the automation pipeline:

1. **Data definition** - `public/data/2024/classes.json` line 2068-2077: Battle Magic feature is correctly defined with `type: "bonus_action_attack"` and `trigger: "after_casting_action_spell"`

2. **Info builder** - `src/services/combat/automation/automationInfoBuilder/attack.js` line 171-188: `bonus_action_attack` handler correctly builds the info object with trigger field

3. **Router** - `src/services/combat/automation/automationRouter.js` line 45-55: `bonus_action_attack` is correctly routed to `bonusActions` array

4. **Handler** - `src/services/automation/handlers/combat/bonusActionAttackHandler.js` line 7-94: Only handles `after_attack_action_with_polearm` trigger; falls through to `automationInfoPopup(action)` for all other triggers including `after_casting_action_spell`

5. **Missing trigger emission**: No code exists that emits `after_casting_action_spell` or checks for this trigger. The spell casting pipeline (`src/services/combat/steps/directSpellDamageSteps.js`) does not emit any event that would trigger this automation.

The root cause is that the trigger `after_casting_action_spell` is defined in the data but there is no corresponding trigger emission or handler in the spell casting pipeline or the bonus action attack handler.

## Notes

- The manifest at `docs/automations-manifest.json` line 701-709 correctly identifies this as CLA-030, type `classFeature`, class `Bard`, with trigger conditions "Action: bonus_action; Uses: variable"
- The manifest handler/router paths are outdated (reference files that don't exist in the current architecture)
- The `bonusActionAttackHandler.js` test file (`bonusActionAttackHandler.test.js`) only tests the `after_attack_action_with_polearm` trigger path, confirming no tests exist for the `after_casting_action_spell` path
- Similar trigger-based automations (e.g., `after_attack_hit`, `after_spell_cast`) are handled by the feature riders system in `src/services/combat/steps/features/` - a similar approach would be needed for `after_casting_action_spell`
