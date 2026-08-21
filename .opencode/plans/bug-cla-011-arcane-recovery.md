# Bug: Arcane Recovery (CLA-011) - Slot Level Cost Not Properly Enforced

## Overview

Arcane Recovery, the Wizard class feature that allows recovering expended spell slots on a short rest, does not properly enforce the rules restriction that "the spell slots can have a combined level equal to no more than half your Wizard level (round up)." The current implementation counts each recovered slot as costing 1 level regardless of the slot's actual level.

## Expected Behavior

Per the official rules: "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a **combined level** equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher."

For a level 4 Wizard:
- `arcaneRecoveryLevels` = ceil(4/2) = 2
- The wizard should be able to recover slots with a **combined level** of at most 2
- Valid combinations: one level 2 slot, or two level 1 slots
- Invalid: two level 2 slots (combined level 4 > 2)

## Actual Behavior

The implementation in `ShortRestModal.jsx` (lines 276-291) and `restRules-shortRest.js` (lines 72-98) counts each slot as costing 1 level:

```javascript
// ShortRestModal.jsx lines 276-291
for (const level of [1, 2, 3, 4, 5]) {
    if (slotsRecovered >= maxSlotsToRecover) break;  // Counts slots, not levels
    const slotKey = `spell_slots_level_${level}`;
    const max = playerStats.spellAbilities?.[slotKey] || 0;
    const current = Number(getRuntimeValue(playerStats.name, slotKey) ?? max);
    const available = max - current;
    if (available > 0) {
        const toRecover = Math.min(available, maxSlotsToRecover - slotsRecovered);
        setRuntimeValue(playerStats.name, slotKey, current + toRecover, campaignName);
        slotsRecovered += toRecover;  // BUG: increments by slot count, not slot level
    }
}
```

This means a level 4 Wizard with `arcaneRecoveryLevels = 2` could recover:
- Two level 1 slots (correct: combined level = 2)
- Two level 2 slots (incorrect: combined level = 4, should be max 2)

The `slotsRecovered` variable increments by the **number of slots** recovered, not by their **combined level**.

## Steps to Reproduce

1. Create a level 4 Wizard character with `rules: "2024"` and Arcane Recovery enabled
2. Set `arcaneRecoveryLevels` to 2 (correct for level 4: ceil(4/2) = 2)
3. Have at least 2 expended level 2 spell slots available
4. Take a short rest and click "Recover Spell Slots" for Arcane Recovery
5. Observe that both level 2 slots are recovered even though their combined level (4) exceeds the max (2)

## Likely Location

**Primary bug location:**
- `src/components/char-sheet/ShortRestModal.jsx` lines 276-291 - `handleComplete` function, Arcane Recovery section
- `src/services/rules/effects/restRules-shortRest.js` lines 72-98 - `applyShortRest` function, Arcane Recovery section

Both locations have the same bug pattern:
```javascript
// BUG: should be `slotsRecovered += level` not `slotsRecovered += toRecover`
const toRecover = Math.min(available, maxSlotsToRecover - slotsRecovered);
slotsRecovered += toRecover;  // Should be: slotsRecovered += level * toRecover
```

## Notes

- The `arcaneRecoveryLevels` resource correctly stores the max combined level (ceil(level/2))
- The slot level restriction (no level 6+) is correctly enforced by iterating only over `[1, 2, 3, 4, 5]`
- The resource is correctly reset on Long Rest via `LONG_REST_RESOURCES` array
- The UI correctly displays "Regain expended Wizard spell slots up to level X. No slots level 6+."
- The existing unit test in `restRules-shortRest.test.js` only tests with level 1 slots, so the bug was not caught
- The `resourceCheck.js` `getResourceAmount` function correctly handles Arcane Recovery by looking up `arcaneRecoveryLevelsUses`
- The `TrackedResourceInput` in `CharClassFeatures.jsx` correctly displays the Arcane Recovery Levels counter
