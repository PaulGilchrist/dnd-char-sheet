# Bug: Aid Spell Does Not Increase Creature Max HP in Combat Summary

## Overview

When Aid is cast on a creature, the spell correctly stores `aidHpMaxIncrease` in the runtime store, increases `currentHitPoints`, adds the Aid buff to `activeBuffs`, and adds an expiration. However, the creature's max HP displayed in the combat summary (initiative page, character sheet) does NOT reflect the Aid HP max increase. The `applyMaxHpPassives` function only processes `passive_rule` effects with `max_hp_increase`, and never reads the `aidHpMaxIncrease` runtime value.

## Expected Behavior

According to the 2024 ruleset spell description:
> "Choose up to three creatures within range. Each target's Hit Point maximum and current Hit Points increase by 5 for the duration."

When Aid is cast at level 2:
- Target's HP max should increase by 5 (e.g., 11 → 16)
- Target's current HP should increase by 5 (e.g., 11 → 16, or capped at new max)
- The combat summary should show the updated max HP
- When Aid is stacked, the increase should accumulate (e.g., second Aid at level 2 → +10 total max HP)
- When cast at higher slot levels, the increase should be 5 per slot level above 2 (level 3 → +10, level 4 → +15, etc.)
- The HP max should decrease when the Aid buff expires

## Actual Behavior

After casting Aid:
- `aidHpMaxIncrease` is correctly stored in runtime (e.g., 5)
- `currentHitPoints` is correctly increased
- `activeBuffs` correctly contains `{ name: "Aid", effect: "aid_hp_increase", duration: "8 hours" }`
- Expiration is correctly set with `{ type: "remove_aid_buff", buffName: "Aid", hpKey: "aidHpMaxIncrease" }`
- **BUT** the creature's max HP in the combat summary remains unchanged (e.g., still shows 11/11 instead of 16/16)
- The HP max increase is invisible to the player and not reflected in damage/healing calculations

## Steps to Reproduce

1. Navigate to test-campaign → AidTestCleric (2024 ruleset Cleric, Level 3)
2. Ensure combat is active (initiative page shows creatures)
3. Click "Aid" spell in Actions section
4. Select Level 2 (5 HP increase, 1 slot available)
5. Click "Cast Spell"
6. In target selection popup, select Bandit 1 (NPC with 11/11 HP)
7. Click "Cast Aid (1)"
8. Observe:
   - Bandit 1's current HP increases by 5 (11 → 16)
   - Bandit 1's max HP remains 11 (should be 16)
   - The Aid buff appears in the creature's effects
   - The combat summary shows incorrect max HP

## Likely Location

**Root cause**: `src/services/rules/core/carryingCapacity.js` - `applyMaxHpPassives()` function (lines 11-26)

The function only processes `passive_rule` effects with `max_hp_increase`:

```js
export function applyMaxHpPassives(playerStats, hitPoints) {
    const passives = playerStats.automation?.passives || [];
    for (const passive of passives) {
        if (passive.type === 'passive_rule' && passive.effect === 'max_hp_increase') {
            // ... handles passive_rule max_hp_increase
        }
    }
    return hitPoints;
}
```

It does NOT check for `aidHpMaxIncrease` from the runtime store.

**Fix location**: Add to `applyMaxHpPassives()` in `carryingCapacity.js`:
```js
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

// In applyMaxHpPassives:
const aidIncrease = Number(getRuntimeValue(playerStats.name, 'aidHpMaxIncrease')) || 0;
hitPoints += aidIncrease;
```

**Alternative fix location**: In `src/services/rules/core/abilityCalc.js` line 53 and `abilityCalc2024.js` line 87, where `getHitPoints()` calls `applyMaxHpPassives()`, the aid increase could be added after the call.

## Notes

- The handler code (`aidHandler.js`) is correct - it stores the value, increases current HP, adds the buff, and sets up expiration
- The expiration removal (`clearExpirationEffects.js` lines 338-346) correctly resets `aidHpMaxIncrease` to 0
- The `activeBuffs` array correctly tracks the Aid buff with `effect: "aid_hp_increase"`
- All 21 unit tests in `aidHandler.test.js` pass - but they test the handler in isolation, not the integration with `getHitPoints()`
- The `heal_at_slot_level` mapping in spells.json is correct: 2→5, 3→10, 4→15, 5→20, etc.
- The `hpMaxIncreaseExpression` in spells.json is `"5 + ((spellSlotLevel - 2) * 5)"` which evaluates correctly
- This affects both 5e and 2024 rulesets since both use `applyMaxHpPassives()`
