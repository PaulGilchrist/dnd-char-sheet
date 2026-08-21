# Bug: MN-001 Ambush - Initiative Roll Popup Crash

## Overview

The Ambush maneuver (MN-001) works correctly for Stealth skill checks but fails on Initiative rolls because the initiative roll popup never appears due to a crash in `logAndShow`.

## Expected Behavior

1. When rolling a Dexterity (Stealth) check, the "Ambush (Superiority Die)" button should appear on the dice roll result popup.
2. When rolling Initiative, the "Ambush (Superiority Die)" button should appear on the dice roll result popup.
3. Clicking the Ambush button should expend one superiority die and add the d12 roll to the check/roll total.

## Actual Behavior

1. **Stealth check**: Works correctly. Ambush button appears, clicking it adds the superiority die, and superiority dice decrements.
2. **Initiative roll**: The popup never appears. The console shows:
   ```
   TypeError: Cannot set properties of undefined (setting 'forcedMode')
       at logAndShow (useLoggedDiceRollAttack.js:120:18)
   ```
   This crash occurs before `processInitiativeRoll` is called, so the popup is never set.

## Steps to Reproduce

1. Create a 2024 Battle Master Fighter (level 3+) with Ambush selected as a maneuver.
2. Roll a Stealth check - observe the "Ambush (Superiority Die)" button appears.
3. Click the Initiative link on the character sheet - observe NO popup appears.
4. Check browser console - see the TypeError at `useLoggedDiceRollAttack.js:120`.

## Likely Location

**Root cause**: `src/hooks/combat/useLoggedDiceRollAttack.js` line 120

```javascript
// Line 120: context is undefined when rollInitiative is called without context
const contextKeys = ['notice', 'bardicInspirationDefense', ...];
for (const key of contextKeys) {
    if (ctx[key] !== undefined) {
        context[key] = ctx[key];  // CRASH: context is undefined
    }
}
```

**Trigger**: When `rollInitiative` is called from `CharSummary.jsx:206` without a context argument:
```javascript
rollInitiative(effectiveInitiative, playerStats.initiativeAdvantage ? { forcedMode: 'advantage' } : undefined);
```

When `playerStats.initiativeAdvantage` is falsy, `context` is `undefined`, causing the crash at line 120.

The crash happens BEFORE the `processInitiativeRoll` call at line 335, which would have set the popup with `availableSuperiorityManeuvers`.

**Fix**: Add a null check for `context` at line 120:
```javascript
if (context) {
    const contextKeys = [...];
    for (const key of contextKeys) {
        if (ctx[key] !== undefined) {
            context[key] = ctx[key];
        }
    }
}
```

## Notes

- The Ambush maneuver **data and routing** are correct. The `processInitiativeRoll` function properly includes `availableSuperiorityManeuvers` in the popup (line 37 of `initiativeProcessing.js`).
- The Ambush maneuver **works correctly for Stealth checks** - this was verified in the browser test.
- Superiority dice correctly decremented from 3/4 to 2/4 after using Ambush on a Stealth check.
- Superiority die size is correctly d8 for a level 3 Battle Master Fighter.
