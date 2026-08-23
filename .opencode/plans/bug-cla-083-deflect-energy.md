# Bug: CLA-083 Deflect Energy - Reaction Automation Not Triggering

## Summary
Deflect Energy (Monk Level 13) reaction automation does not trigger when the character takes damage of any type. The damage pipeline fails to apply damage due to missing `currentHitPoints` in the runtime store, and the reaction modal is never shown.

## Steps to Reproduce
1. Create a Level 13 2024 Monk character (Warrior of the Open Hand)
2. Add character to an encounter with a Fire Elemental
3. Set Fire Elemental target to the Monk
4. Execute Fire Elemental's "Burn" attack (deals 10-11 Fire damage)
5. Observe that damage fails to apply and no reaction prompt appears

## Expected Behavior
- Damage is applied to the character
- Deflect Energy reaction modal appears (since it triggers on "any_damage")
- Player can choose to use the reaction to reduce damage by 1d10 + Dex mod + Monk level
- If damage is reduced to 0, redirect prompt appears

## Actual Behavior
- Console error: `[applyDamage] currentHitPoints not found for "DeflectMonk2024"`
- Damage is not applied (HP remains unchanged)
- No reaction modal or prompt appears
- Attack completes without triggering any automation

## Root Cause Analysis
1. **Primary Issue**: `currentHitPoints` field is missing from the runtime store for the character. The `applyDamageToTarget` function in `applyDamage.js:256` logs an error and fails when `currentHitPoints` is not found.
2. **Secondary Issue**: Even if damage applied successfully, `getDamageReduction` in `automationPassives.js:364` explicitly filters out automations with `reaction: true`, meaning the Deflect Energy reaction would not auto-trigger. The reaction would need to be manually triggered via the UI.

## Affected Files
- `/Users/paulgilchrist/Source/dnd-campaign-suite/src/services/rules/combat/applyDamage.js` - Line 256: `applyDamageToTarget` fails when `currentHitPoints` missing
- `/Users/paulgilchrist/Source/dnd-campaign-suite/src/services/combat/automation/automationPassives.js` - Line 364: `getDamageReduction` skips `reaction: true` automations
- `/Users/paulgilchrist/Source/dnd-campaign-suite/src/services/automation/handlers/combat/damageReductionHandler.js` - Handles damage reduction calculations and `deflectRedirect` modal
- `/Users/paulgilchrist/Source/dnd-campaign-suite/src/components/char-sheet/CharReactions.jsx` - Renders available reactions in the UI
- `/Users/paulgilchrist/Source/dnd-campaign-suite/public/data/2024/classes.json` - Defines Deflect Energy automation schema

## Severity
High - Prevents testing of the feature and blocks damage application to player characters.

## Notes
- The character's HP shows correctly on the sheet (55/55) but the runtime store lacks the `currentHitPoints` field
- The reaction is correctly defined in `classes.json` with `trigger: "any_damage"`, `reaction: true`, `redirect: true`
- The UI correctly displays Deflect Energy in the Reactions section of the character sheet
