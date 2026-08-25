# Bug: CLA-147 Frenzy — Flag Set on Miss, Blocks Frenzy on Subsequent Hit

## Summary
Frenzy (Barbarian Path of the Berserker feature) sets the `_frenzyUsedRound` flag when conditions are met (raging + reckless attack), regardless of whether the attack hits or misses. This prevents Frenzy from applying to subsequent attacks in the same round that actually hit.

## Expected Behavior
Frenzy adds rage damage to the first Strength-based melee hit on a turn when raging with Reckless Attack active. Once per turn. If the first attack misses, Frenzy should still be available for the next hit.

## Actual Behavior
1. Barbarian attacks with Reckless Attack while raging
2. Attack misses (e.g., 12 vs AC 16)
3. `_frenzyUsedRound` is set to 1 (flag consumed on miss)
4. Next attack hits (e.g., 21 vs AC 16)
5. Frenzy is skipped because `_frenzyUsedRound === 1`
6. No rage damage applied to the hit

## Root Cause
Two locations set `_frenzyUsedRound` without checking `ctx.hit`:

1. **`src/services/combat/steps/attackRollBonuses.js:76`** — Sets flag after checking rage + reckless conditions, but before knowing if attack hits
2. **`src/services/automation/contextBuilder-sync.js:163`** — Sets flag during context building (before attack roll)

Both should only set the flag when the attack actually hits.

## Fix Required
- `attackRollBonuses.js:76`: Add `ctx.hit` check before setting `_frenzyUsedRound`
- `contextBuilder-sync.js:163`: Remove the `_frenzyUsedRound` setter (runs before attack roll, hit/miss unknown)

## Files to Modify
- `src/services/combat/steps/attackRollBonuses.js`
- `src/services/automation/contextBuilder-sync.js`

## Test Character
- DraconicDragon (Barbarian 5, Path of the Berserker, Red Dragonborn)
