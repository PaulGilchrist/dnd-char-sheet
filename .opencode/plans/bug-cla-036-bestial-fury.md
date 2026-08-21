# Bug: CLA-036 Bestial Fury - Hardcoded 1d6 Instead of Hunter's Mark Bonus Damage

## Overview

The Ranger's Bestial Fury class feature does not correctly apply Hunter's Mark bonus damage when the Primal Companion uses Beast's Strike. Instead of dynamically reading the Hunter's Mark spell's bonus damage, the handler returns a hardcoded `1d6` Force damage.

## Expected Behavior

When commanding Primal Companion to take Beast's Strike, the beast can use it twice. First time each turn it hits a creature under Hunter's Mark, deals extra Force damage equal to the bonus damage of the Hunter's Mark spell.

## Actual Behavior

The `primal_companion_double_strike_damage` handler in `damage.js` returns a hardcoded `damageExpression: '1d6'` instead of dynamically reading the Hunter's Mark spell's bonus damage from the player's active effects. The damage amount does not scale with spell slot level or match the actual Hunter's Mark bonus.

## Steps to Reproduce

1. In "test-campaign", create a 2024 Ranger (Level 11+) with Primal Companion and Bestial Fury
2. Cast Hunter's Mark on a target (bonus damage scales with spell slot level)
3. Summon Primal Companion via spell
4. Command the companion to use Beast's Strike against the Hunter's Mark target
5. Observe: Extra Force damage is always 1d6 regardless of Hunter's Mark spell slot level

## Likely Location

- `src/services/combat/automation/automationInfoBuilder/damage.js` — `primal_companion_double_strike_damage` handler returns hardcoded `damageExpression: '1d6'` instead of reading Hunter's Mark bonus from active effects
- `src/services/combat/automation/handlers/primalCompanionHandler.js` — Routes the double strike damage through the handler
- `public/data/2024/classes.json` — Defines `primal_companion_double_strike` automation metadata

## Notes

The automation flow is: `primal_companion_double_strike` → `primal_companion_double_strike_damage` → `automationRouter.js` → `primalCompanionHandler.js`. The fix should read the Hunter's Mark spell's current bonus damage from the player's active effects/spell data rather than hardcoding `1d6`. The bonus damage should match what the Ranger would deal with their own Hunter's Mark attack at the current spell slot level.
