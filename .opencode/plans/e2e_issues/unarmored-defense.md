# Unarmored Defense - E2E Test Issue

## Summary
**Automation**: Unarmored Defense (ID: 2)
**File**: classes.json
**Type**: classes
**Source Type**: passive_rule
**Test Status**: ✅ PASSING (10/10 tests)
**Test File**: tests/e2e/classes/unarmored-defense.spec.js
**Date Tested**: 2026-08-20

## Description
Unarmored Defense is a class feature for Barbarian (2024) that sets base AC to 10 + DEX + CON when not wearing armor. At level 20, Barbarians receive +4 to STR and CON (ASI at level 20), making CON 20 (+5 modifier).

## JSON Definition
```json
{
  "name": "Unarmored Defense",
  "description": "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers.",
  "level": 1,
  "type": "class_feature",
  "automation": {
    "type": "passive_rule",
    "effect": "unarmored_defense_ac",
    "casting_time": "passive"
  }
}
```

## Expected Behavior
- AC = 10 + DEX modifier + CON modifier when no armor equipped
- Unarmored Defense takes precedence over armor when it provides better AC
- No armor or shield should be equipped for the feature to apply (for Bard College of Dance, shield also blocks it)

## Actual Behavior
- AC correctly calculated as 17 for level-20 Barbarian with DEX 14, CON 16
- Level-20 ASI adds +4 to CON: 16 + 4 = 20 → modifier +5
- AC = 10 + 2 (DEX) + 5 (CON) = 17 ✓
- When leather armor (AC 13) is equipped, Unarmored Defense still applies (17 > 13) ✓

## Code References
- **AC Calculation**: `src/services/rules/rules-armorClass.js:156-162` (2024 Barbarian unarmored defense)
- **Level-20 ASI**: `src/services/rules/core/abilityCalc2024.js:14-16` (+4 to STR/CON for level-20 Barbarian)
- **UI Display**: `src/components/char-sheet/char-summary/CharSummary.jsx:268` (Armor Class in summaryGrid)

## Test Coverage
- ✅ AC calculation without armor
- ✅ AC formula includes Constitution modifier
- ✅ AC during player attacks (action)
- ✅ AC during player attacks (bonus action)
- ✅ AC when attacked by NPC (reaction)
- ✅ AC when attacking NPC (unlimited special actions)
- ✅ AC when NPC attacks Barbarian (special action)
- ✅ AC comparison with armor equipped (Unarmored Defense takes precedence)

## Notes
- No visible automation badge on creature cards (passive rule, not a buff)
- The AC popup formula shows "Armor Class (17) = ..." but the Constitution component is in the page content
- Level-20 Barbarian ASI (+4 to STR/CON) is a 2024 ruleset feature handled in abilityCalc2024.js

## Bugs Found
None. The feature works correctly.
