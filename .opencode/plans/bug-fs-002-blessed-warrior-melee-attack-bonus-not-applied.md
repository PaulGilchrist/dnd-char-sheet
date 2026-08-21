# FS-002 Blessed Warrior: +2 Melee Attack Bonus Not Applied

## Overview

The Blessed Warrior fighting style should grant a +2 bonus to attack rolls made with melee weapons. The bonus is never applied to the final attack roll calculation.

## Expected Behavior

You gain a +2 bonus to attack rolls you make with melee weapons.

## Actual Behavior

The Blessed Warrior fighting style is present in the character's `fightingStyles` array, but the +2 bonus is not included in the attack roll hit bonus.

**Example:**
- Character: TestCleric (Human, Cleric Life Domain, Level 6, 2024 ruleset)
- Base hit bonus: +2 (Dex -1 + Proficiency +3)
- Observed hit bonus on melee attack: +2 (missing Blessed Warrior)
- Expected hit bonus: +4 (Dex -1 + Proficiency +3 + Blessed Warrior +2)

## Steps to Reproduce

1. In "test-campaign", use or create a 2024 Cleric with the Blessed Warrior fighting style
2. Start combat with an enemy
3. Make a melee weapon attack (e.g., Unarmed Strike)
4. Observe the attack roll — the +2 Blessed Warrior bonus is missing from the hit bonus

## Likely Location

- `src/services/rules/features/attackCalc2024.js:140` — Checks `playerStats.class?.fightingStyles` directly for 'Blessed Warrior' and should apply `extraHitBonus: 2`, but the bonus is not being applied to the final calculation.

## Notes

- The character file correctly includes `'Blessed Warrior'` in the `fightingStyles` array
- The check at line 140 exists but the `extraHitBonus` value is not being propagated to the final attack roll computation
- Need to verify that the fighting style bonus is being added to the hit bonus calculation pipeline
