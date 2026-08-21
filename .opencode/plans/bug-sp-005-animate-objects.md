# Bug: SP-005 Animate Objects - Monster Index Mismatch

## Overview

The Animate Objects spell in the 2024 ruleset references monster indices that do not exist in the monsters.json data file. The spell references `animate-objects-medium`, `animate-objects-large`, and `animate-objects-huge`, but the actual monster entries use the index format `animated-object-medium`, `animated-object-large`, and `animated-object-huge`. This causes the spell automation to fail silently with an error popup.

## Expected Behavior

When a Bard, Sorcerer, or Wizard (level 9+) casts Animate Objects in the 2024 ruleset, the spell should:
1. Present a modal to choose between Medium, Large, and Huge animated object variants
2. Successfully summon the chosen animated object creature into combat
3. The creature should have the correct stats: AC 15, HP 10 (Medium)/20 (Large)/40 (Huge), Speed 30 ft.
4. The creature should appear in the combat summary and be controllable

## Actual Behavior

When casting Animate Objects, the spell handler attempts to load monster data using the referenced indices and fails. The `loadMonsterData` function in `summonSpiritHandler.js` returns `null` because no monsters match the referenced indices. The user sees an error popup: "Failed to load monster data for [variant name]." No creature is summoned.

## Steps to Reproduce

1. Start the app with `npm run dev`
2. Navigate to test-campaign in the app
3. Create or edit a level 9+ 2024 Wizard/Bard/Sorcerer character
4. Cast the Animate Objects spell (level 5)
5. Observe the error popup instead of a creature summoning modal
6. Check the browser console for `[summonSpirit] Monster "animate-objects-medium" not found in monsters.json` error logs

## Likely Location

**Primary bug**: `public/data/2024/spells.json` line ~313-340

The automation block for Animate Objects references:
```json
"variants": [
    { "name": "Animated Object (Medium)", "monsterIndex": "animate-objects-medium" },
    { "name": "Animated Object (Large)", "monsterIndex": "animate-objects-large" },
    { "name": "Animated Object (Huge)", "monsterIndex": "animate-objects-huge" }
]
```

But the actual monster indices in `public/data/monsters.json` are:
- `animated-object-medium` (AC 15, HP 10, Speed 30 ft.)
- `animated-object-large` (AC 15, HP 20, Speed 30 ft.)
- `animated-object-huge` (AC 15, HP 40, Speed 30 ft.)

**Fix**: Change the `monsterIndex` values in `public/data/2024/spells.json` from `animate-objects-*` to `animated-object-*`.

## Notes

- The monster data itself is correct: AC 15, HP 10/20/40, Speed 30 ft. all match the expected behavior from the automation manifest.
- The `summonSpiritHandler.js` handler is correctly implemented and would work if the monster indices matched.
- The 5e version of the spell (`public/data/spells.json`) does NOT have an automation block, so this bug only affects the 2024 ruleset.
- The monster descriptions reference "An object animated by the Animate Objects spell" confirming these are the correct monsters, just with a different index naming convention.
