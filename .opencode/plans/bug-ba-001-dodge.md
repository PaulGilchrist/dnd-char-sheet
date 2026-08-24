# Bug Report: BA-001 - Dodge Action Disadvantage Not Applied to Attack Rolls

## Overview

When a creature takes the Dodge action, attack rolls made against it should have Disadvantage (roll two d20s, take the lower). However, the attack roll is being made with a single d20, ignoring the Dodge effect entirely.

## Expected Behavior

When Disciplined_Monk takes the Dodge action and the Aarakocra Aeromancer attacks with Wind Staff:
1. The attack roll should show **two d20 values** (e.g., "d20 4 d20 8 +5")
2. The lower d20 value should be used for the total
3. The popup should indicate "Disadvantage" is active
4. The log entry should reflect the disadvantage roll

## Actual Behavior

The attack roll shows only a **single d20 value** (e.g., "d20 4 +5"), indicating the Dodge disadvantage effect was not applied. The roll was made as if the target had no Dodge effect active.

Evidence from test:
- Dodge action was successfully activated (visible on character sheet and initiative)
- Dodge effect badges "Disadv vs" and "Adv DEX Save" are visible on Disciplined_Monk
- Campaign log confirms Dodge was taken at 09:56:13 PM
- Wind Staff attack at 10:02:58 PM shows: "(4)" and "4+5 (+5 to hit)" — single d20 roll

## Steps to Reproduce

1. Navigate to test-campaign, load Disciplined_Monk character
2. Join encounter with Aarakocra Aeromancer via Encounter Builder
3. Start combat (creatures added to initiative)
4. On Disciplined_Monk's turn, click "Dodge" in Base Actions section
5. Verify Dodge is active (show "Disadv vs" and "Adv DEX Save" badges)
6. Click on Aarakocra Aeromancer creature card to open monster card modal
7. Set target to Disciplined_Monk in the target combobox
8. Click the "+5" Wind Staff attack dice link
9. Observe the attack result popup — it shows a single d20 roll instead of two d20s with disadvantage

## Likely Location

The bug is likely in one of these areas:

1. **`src/components/encounter/MonsterCardModal.jsx`** — The `handleAttack` function calls `combineAttackModes(attackerEffects, targetEffectData, attackRange, target?.name)` at line 285 to determine advantage/disadvantage. The `targetEffectData` is computed from the target's conditions and targetEffects at line 244, but the `dodge` effect type may not be recognized as producing attack disadvantage.

2. **`src/services/combat/conditions/conditionEffects.js`** — The `computeConditionEffects` function processes target effects into condition effect data. The `dodge` effect type (added by `handleDodgeAction` in `useCharActionsBaseActions.js`) may not be mapped to `targetDisadvantageCount` or similar fields that `combineAttackModes` checks.

3. **`src/services/combat/conditions/targetEffectDefinitions.js`** — The `dodge` effect definition may be missing the proper classification for attack disadvantage.

4. **`src/services/combat/conditions/combineAttackModes.js`** (or equivalent) — The function that combines attacker and target effect data into a final attack mode may not handle the `dodge` effect.

The most likely root cause: The `dodge` targetEffect type is not being converted to an attack disadvantage flag in the condition effects computation pipeline. The `handleDodgeAction` function correctly adds the buff and expiration, and the effect badges display correctly, but the effect data is not flowing through to the attack roll computation.

## Notes

- The Dodge action UI works correctly: the buff is toggled, badges display, and the log entry is created
- The `handleDodgeAction` in `src/components/char-sheet/useCharActionsBaseActions.js:114` adds `effect: 'dodge'` to the targetEffects
- The `targetEffectDefinitions.js` defines the `dodge` effect with label "Disadvantage on attacks" and group "Defensive"
- The issue is specifically in the **attack roll computation pipeline**, not in the Dodge action activation itself
- The attack result popup shows both "Advantage" and "Disadvantage" as clickable options, suggesting the mode determination logic exists but the Dodge effect is not being picked up
