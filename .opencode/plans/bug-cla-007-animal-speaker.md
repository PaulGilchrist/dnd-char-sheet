# Bug: CLA-007 Animal Speaker - Beast Sense Not Appearing in Spells

## Overview

When creating a 2024 Barbarian with Path of the Wild Heart subclass, the Animal Speaker feature correctly grants Speak with Animals as a ritual spell, but Beast Sense is missing from the spells list despite also being granted by the feature.

## Expected Behavior

Both Beast Sense and Speak with Animals should appear in the Spells table for a Level 3+ Barbarian with Path of the Wild Heart, both with casting_time set to "Ritual" and Wisdom as the spellcasting ability.

## Actual Behavior

Only Speak with Animals appears in the Spells table. Beast Sense is missing entirely from the spells list.

## Steps to Reproduce

1. In "test-campaign", create a new character
2. Select 2024 Ruleset
3. Select Human race, Soldier background
4. Select Barbarian class, Path of the Wild Heart subclass
5. Set level to 3 (Animal Speaker is a level 3 feature)
6. Save the character
7. View the character sheet
8. Observe the Spells section - only Speak with Animals appears, Beast Sense is missing

## Likely Location

**File**: `src/services/character/getPreSelectedSpells.js`
**Line**: 24

The `knownSpells` array includes 'Speak with Animals' but is missing 'Beast Sense'. The `extractSpellsFromDescription` function parses spell names from feature descriptions (like "You can cast the Beast Sense and Speak with Animals spells") but only adds them if they're in the `knownSpells` array.

**Fix**: Add 'Beast Sense' to the `knownSpells` array at line 24.

## Notes

- The spellCalc2024.js ritual casting_time override (line 504-511) correctly handles both Beast Sense and Speak with Animals
- The Animal Speaker feature is correctly displayed in the Character Advancement section
- Wisdom is correctly used as the spellcasting ability (verified by Save DC: 9 = 8 + 2 proficiency + -1 Wis mod)
- The `getPreSelectedSpells` function is used during character creation to pre-populate the spells list
- The `spellCalc2024.js` line 150 only adds subclass spells when `playerStats.level > 2` AND `playerStats.class.major.spells` exists - but Path of the Wild Heart has no `spells` array in the class data, so this path doesn't add any spells
- The spells are currently only added via `extractSpellsFromDescription` parsing the Animal Speaker feature description
