# Bug: FT-008 Boon Of Dimensional Travel - Trigger Not Evaluated

## Overview

The Boon of Dimensional Travel feat (FT-008) has a trigger condition `after_attack_or_action` defined in its automation metadata, but this trigger is never evaluated by the automation system. The feat appears as a regular always-available action instead of being conditionally available only after taking an Attack action or the Action.

## Expected Behavior

According to the feat description and manifest:
> "Immediately after you take the Attack action or the Action, you can teleport up to 30 feet to an unoccupied space you can see."

The Blink Steps teleport should:
1. NOT be available as a regular action at any time
2. Automatically trigger (show teleport modal) immediately after the Attack action pipeline completes
3. OR appear as a conditional action that only becomes available after an attack/action is taken

## Actual Behavior

1. Blink Steps appears as a regular action button in the Actions section, always available regardless of whether an Attack or Action was taken
2. Clicking Blink Steps opens the teleport modal at any time (not just after an attack)
3. After taking an Attack action, the Blink Steps teleport does NOT automatically trigger
4. The `trigger: "after_attack_or_action"` field in the automation data is stored but never evaluated

## Steps to Reproduce

1. Create a 2024 character with the Boon of Dimensional Travel feat (level 19+)
2. Add a target creature to combat (e.g., Ancient Red Dragon)
3. Set the character's target to the creature
4. Click "Unarmed Strike" (or any attack) to take an Attack action
5. Observe that after the attack completes, NO teleport modal appears
6. Click "Blink Steps" directly — the teleport modal opens immediately, even though no attack was taken first

## Likely Location

1. **Automation trigger evaluation**: `src/services/combat/automation/` — No code exists that evaluates `trigger: "after_attack_or_action"`. The trigger field is stored in the automation info object (via `automationInfoBuilder/temp.js` line 32: `trigger: auto.trigger || null`) but never checked by any handler or pipeline step.

2. **feat data**: `public/data/2024/feats.json` line 239-264 — The Boon of Dimensional Travel's Blink Steps benefit has:
   ```json
   "automation": {
     "type": "temp_buff",
     "trigger": "after_attack_or_action",
     "effect": "bonus_teleport",
     "distance": "30 ft",
     "requiresLineOfSight": true,
     "casting_time": "1 action"
   }
   ```

3. **Info builder**: `src/services/combat/automation/automationInfoBuilder/temp.js` — The `temp_buff` handler stores the trigger: `trigger: auto.trigger || null` (line 32)

4. **Handler delegation**: `src/services/automation/handlers/buffs/buffHandler.js` line 87 — Delegates `bonus_teleport` to `tempTeleportHandler`, which always returns `{ type: 'modal', modalName: 'teleport' }` without checking the trigger.

5. **Handler map**: `src/services/automation/index.js` line 306 — `temp_buff: handleBuff`

6. **Router**: `src/services/combat/automation/automationRouter.js` line 131 — `temp_buff` routes to `specialActions`, but the feat's `casting_time: "1 action"` also puts it in `playerStats.actions` via `rules-featFeatures.js` line 61-62.

## Notes

- The teleport modal that DOES appear contains a spurious "150 ft — Once per Rage" radio option, which is a warlock-specific feature option that should not be present for this feat. This is a separate UI bug in `TeleportModal.jsx`.
- The feat is correctly added to `playerStats.actions` due to `casting_time: "1 action"`, but the trigger condition is completely ignored.
- The automation system has trigger evaluation for other triggers (e.g., `after_attack_hit`, `after_attack_miss`, `after_spell_cast`) in various info builders, but `after_attack_or_action` has no corresponding evaluation logic anywhere in the codebase.
- To fix this, either:
  a) Add trigger evaluation for `after_attack_or_action` in the combat pipeline, OR
  b) Change the automation type to something that automatically fires as a passive/special action after an attack completes.
