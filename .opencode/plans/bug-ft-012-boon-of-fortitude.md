# Bug: FT-012 Boon Of Fortitude - Inconsistent Once-Per-Turn Check Storage

## Overview

The Boon Of Fortitude feat's once-per-turn extra healing check uses inconsistent storage locations across different functions. `resolveHealingBonuses` stores the `_fortifiedHealth_usedRound` flag at the campaign level, while `resolveHealingBonusesWithDetails` checks it at the character level. This means the once-per-turn restriction may not work correctly when healing is processed through `resolveHealingBonusesWithDetails` (which is the primary function used by healing handlers).

## Expected Behavior

When a character with Boon Of Fortitude regains Hit Points, the extra healing equal to Constitution modifier should be applied once per turn. The `_fortifiedHealth_usedRound` flag should prevent the extra healing from being applied more than once until the start of the next turn.

## Actual Behavior

The once-per-turn check has inconsistent storage:

1. **`resolveHealingBonuses`** (line 131 of `automationPassives.js`):
   ```javascript
   const stored = getRuntimeValue(null, '_fortifiedHealth_usedRound', campaignName);
   ```
   Stores at **campaign level** (third argument = campaignName).

2. **`resolveHealingBonusesWithDetails`** (line 157 of `automationPassives.js`):
   ```javascript
   const stored = getRuntimeValue(playerStats.name, '_fortifiedHealth_usedRound');
   ```
   Checks at **character level** (first argument = playerStats.name, no campaignName).

3. **`resolveHealingBonusesWithDetails` for target stats** (line 181 of `automationPassives.js`):
   ```javascript
   const stored = getRuntimeValue(targetStats.name, '_fortifiedHealth_usedRound');
   ```
   Also checks at **character level** (no campaignName).

Since `resolveHealingBonusesWithDetails` is the function called by all healing handlers (healingHandler.js, massHealHandler.js, prayerOfHealingService.js, etc.), the once-per-turn check is looking in the wrong location. The flag is stored at the campaign level but checked at the character level, causing the check to always find `null` and allow the extra healing on every heal.

## Steps to Reproduce

1. Create a 2024 character with the Boon Of Fortitude feat (level 19+)
2. Ensure Constitution modifier is positive (e.g., CON 15 = +2)
3. Reduce character HP below maximum
4. Use any healing ability (Second Wind, healing spell, etc.)
5. Use the same healing ability again without starting a new turn
6. **Expected:** Second heal should NOT include the CON modifier bonus
7. **Actual:** Second heal likely DOES include the CON modifier bonus (bug)

## Likely Location

- `src/services/combat/automation/automationPassives.js` lines 155-167 (`resolveHealingBonusesWithDetails` self check)
- `src/services/combat/automation/automationPassives.js` lines 179-192 (`resolveHealingBonusesWithDetails` target check)
- `src/services/combat/automation/automationPassives.js` line 131 (`resolveHealingBonuses` for comparison)

The fix should make `resolveHealingBonusesWithDetails` use the same storage pattern as `resolveHealingBonuses`:
```javascript
// Line 157 should be:
const stored = getRuntimeValue(null, '_fortifiedHealth_usedRound', campaignName);

// Line 181 should be:
const stored = getRuntimeValue(null, '_fortifiedHealth_usedRound', campaignName);
```

## Notes

- The HP maximum increase of 40 is working correctly (verified: character shows 164/164 HP)
- The extra healing expression evaluation ("CON modifier" → actual value) is working correctly per `automationExpressions.js`
- The `markFortifiedHealthUsed` function correctly sets the flag at the character level, which is consistent with the broken check location
- The real issue is that `resolveHealingBonuses` stores at campaign level while `resolveHealingBonusesWithDetails` checks at character level - they're looking in different places
- API routing issues prevented live testing, but the code analysis clearly shows the inconsistency
