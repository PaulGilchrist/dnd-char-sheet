# Bug: CLA-082 Deflect Attacks - Reaction Modal Never Triggers

## Overview
The Monk's Deflect Attacks class feature (CLA-082) is correctly categorized as a reaction in the automation router and the feature appears in the Monk's Reactions section on the character sheet. However, when the Monk is hit by an attack dealing bludgeoning, piercing, or slashing damage, the Deflect Attacks reaction modal never appears. The `executeHandler` function is never invoked during the damage application process.

## Expected Behavior
When a Monk character is hit by an attack roll that deals bludgeoning, piercing, or slashing damage:
1. A reaction modal for "Deflect Attacks" should appear
2. The player can choose to reduce damage by 1d10 + Dex modifier + Monk level
3. If damage is reduced to 0, the player can expend 1 Focus Point to redirect force to the attacker
4. The attacker makes a Dexterity save or takes damage equal to two Martial Arts die + Dex modifier

## Actual Behavior
The Monk takes the full damage with no reaction modal appearing. The Deflect Attacks feature is correctly registered in the automation system but the execution trigger is missing from the damage pipeline.

## Steps to Reproduce
1. Create a Level 5 Monk character in "test-campaign" with the Deflect Attacks feature enabled
2. Start a combat and add a Goblin enemy with a melee weapon (scimitar - slashing damage)
3. Have the Goblin attack the Monk and hit (e.g., 21 vs AC 14)
4. Observe that no Deflect Attacks reaction modal appears - the Monk takes full damage

## Likely Location
- `src/services/rules/combat/applyDamage.js` - Core damage application logic, missing `executeHandler` call for reaction automations
- `src/services/rules/combat/handlePlainDamage.js` - Damage handler that applies damage but doesn't invoke reaction handlers
- `src/services/automation/index.js` - Registry maps `damage_reduction` to `handleDamageReduction`, exports `executeHandler`
- `src/services/automation/handlers/combat/damageReductionHandler.js` - The handler that should be invoked
- `src/services/combat/automation/automationRouter.js` - Correctly routes `damage_reduction` type to `result.reactions`

The fix requires injecting an `executeHandler` call in `applyDamage.js` or `handlePlainDamage.js` to invoke matching reaction automations (like `damage_reduction`) when damage is applied. The `lastAttack` context and `targetEffects` must be properly populated and passed to satisfy the handler's trigger conditions.

## Notes
- The automation infrastructure exists: `executeHandler` is actively used in other contexts (postCastRiderService, bardicInspirationHandler, reactionBonusHandler, etc.)
- The `damage_reduction` type is correctly categorized as a reaction in automationRouter.js
- The feature is correctly merged into action/reaction pipelines via rules-actions.js
- The root cause is a missing invocation point in the damage application flow, not a registration or categorization issue
