# Bug: SP-002 Animal Friendship - Cast Button Disabled for Utility Spells

## Overview
Utility spells like Animal Friendship cannot be cast through the UI because the `canCast` logic in `SpellDetailPopup.jsx` only checks `upcastLevels` for slot availability. Non-upcastable utility spells return an empty `upcastLevels` array, causing the cast button to remain disabled even when the character has available spell slots.

## Expected Behavior
The cast button for Animal Friendship should be enabled when the character has available spell slots of the appropriate level. The spell should be castable, triggering a Wisdom save for the target beast, applying Charmed condition on failure, and ending if the caster or an ally deals damage to the target.

## Actual Behavior
The cast button remains disabled with text "Cast Animal Friendship (0)" and the `disabled` attribute set. The spell cannot be cast, preventing verification of the automation handler's save roll, condition application, and damage interruption logic.

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create or select a 2024 Bard/Druid/Ranger character with spell slots
4. Navigate to the spell list and find Animal Friendship (level 1)
5. Observe the cast button is disabled even with available spell slots
6. Note: After manually setting `spell_slots_level_1: 2` via runtime state, the slot count shows correctly but the cast button still remains disabled

## Likely Location
- `src/components/SpellDetailPopup.jsx` - `canCast` logic at lines 114-119
- `buildUpcastLevels()` returns empty array for non-upcastable utility spells
- `automation/handlers/spells/animalFriendshipHandler.js` - handler exists and is correct, but unreachable

## Notes
- Target selection modal works correctly (Wolf 1 appears as selectable Beast)
- Spell details popup shows correct description
- Runtime spell slot tracking works (shows "3 slots" after manual update)
- Wolf 1 is correctly in the active encounter/initiative
- The automation handler itself (`animalFriendshipHandler.js`) is correctly implemented
