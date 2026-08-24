# Bug: CLA-109 Eldritch Strike — Disadvantage on Next Save Not Applied

## Overview
Eldritch Strike (Fighter Psycho Warrior feature) correctly triggers on weapon hit and logs the effect being applied, but the Disadvantage on the target's next saving throw is NOT actually applied during spell save resolution.

## Expected Behavior
When a Fighter with Eldritch Strike hits a creature with a weapon attack, that creature should have Disadvantage on its next saving throw against a spell. The save roll should show 2d20 with the lower die used.

## Actual Behavior
The save roll shows only 1d20+3 (single die, rolled 15, total 18). No Disadvantage is applied. The log confirms "EldritchStrike triggered correctly" but the save shows single d20.

## Steps to Reproduce
1. Create a 2024 Fighter (Psycho Warrior archetype) with Eldritch Strike
2. Add Aarakocra Aeromancer to encounter
3. Start combat
4. Have the Fighter hit the monster with a weapon attack
5. Cast a spell requiring a save against the monster (e.g., a spell with DEX save DC 11)
6. Observe the save roll — it shows single d20 instead of 2d20 with Disadvantage

## Likely Location
- `src/services/combat/automation/handlers/classFeatureHandler.js` — Eldritch Strike handler sets `disadvantage_on_next_save` target effect
- Spell save resolution pipeline — the code that resolves saving throws against a creature with the `disadvantage_on_next_save` effect is not reading or applying that effect
- `src/services/rules/combat/saveProcessing.js` or similar — save roll resolution

## Notes
- The target effect IS being set correctly (log confirms "EldritchStrike triggered correctly")
- The effect persists on the creature but is not consumed/applied during spell save resolution
- This is different from other Disadvantage sources (e.g., Eldritch Hex) which DO apply correctly to saves
