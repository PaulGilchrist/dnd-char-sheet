# Bug: CLA-009 Arcane Apotheosis - Metamagic costs not waived

## Overview

Arcane Apotheosis (Sorcerer level 20 capstone feature) is not waiving the highest-cost Metamagic option when Innate Sorcery is active. The MetamagicPopup displays all Metamagic options at their full SP cost with no indication of waiver.

## Expected Behavior

While Innate Sorcery is active on a level 20 Sorcerer with Arcane Apotheosis:
1. The Arcane Apotheosis passive should be present in `playerStats.automation.passives`
2. When selecting Metamagic options in the MetamagicPopup, the highest-cost option should show "0 (waived)"
3. The "Apply & Cast" button should reflect the waived cost (e.g., selecting Heightened Spell (3 SP) + Careful Spell (1 SP) should show "Apply & Cast (1 SP)")

## Actual Behavior

1. `playerStats.automation.passives` is empty - Arcane Apotheosis passive is not present
2. All Metamagic options show their full SP cost (e.g., "3 SP" for Heightened Spell)
3. No option shows "0 (waived)"
4. The waiver logic in `computeMetamagicCost` never triggers because `hasArcaneApotheosis` returns false

## Steps to Reproduce

1. Create a new 2024 ruleset character in "test-campaign"
2. Select Sorcerer class, Draconic Sorcery subclass, Level 20
3. Save the character
4. Activate Innate Sorcery (click on Innate Sorcery resource - shows 1/2 uses remaining)
5. Cast a spell (e.g., Chromatic Orb) - click "Cast Spell"
6. Observe the MetamagicPopup:
   - All options show full costs: Careful Spell 1 SP, Heightened Spell 3 SP, Quickened Spell 2 SP, etc.
   - No option shows "0 (waived)"
   - "Apply & Cast (0 SP)" button is disabled (no metamagic selected)

## Likely Location

**Root cause**: The Arcane Apotheosis passive is not being populated into `playerStats.automation.passives` during `getPlayerStats` execution.

The feature exists in `public/data/2024/classes.json` with correct automation:
```json
{
  "name": "Arcane Apotheosis",
  "level": 20,
  "type": "class_feature",
  "automation": {
    "type": "passive_rule",
    "effect": "arcane_apotheosis",
    "condition": "innate_sorcery_active",
    "casting_time": "passive"
  }
}
```

The automation pipeline exists and should work:
1. `classRules2024.getFeatures()` should include Arcane Apotheosis (has `casting_time: "passive"`, categorizes to `specialActions`)
2. `getActions2024()` merges `features.specialActions` into `playerStats.specialActions`
3. `collectAutomationFromFeatures()` processes features with automation
4. `buildAttackInfo()` dispatches `passive_rule` type to `conditionalHandlers['passive_rule']` which returns `{ type: 'passive_rule', name: 'Arcane Apotheosis', effect: 'arcane_apotheosis' }`
5. `routeAutomation()` routes `passive_rule` with effect `arcane_apotheosis` to `result.passives` (falls through to else branch at line 207-208)

**Files to investigate**:
- `src/services/character/classRules2024.js` - `getFeatures()` at line 144
- `src/services/character/featureCategorizationUtils.js` - `categorizeFeatures()` at line 16
- `src/services/character/featureCategories.js` - `categories2024` at line 136 (Arcane Apotheosis not in any category, should go to `specialActions`)
- `src/services/combat/automation/automationCollector.js` - `collectAutomationFromFeatures()` at line 6
- `src/services/combat/automation/automationInfoBuilder/conditional.js` - `passive_rule` handler at line 81
- `src/services/combat/automation/automationRouter.js` - `passive_rule` case at line 195
- `src/services/rules/spells/metamagicRules.js` - `hasArcaneApotheosis()` at line 101, `computeMetamagicCost()` at line 110

**Note**: The `hasArcaneApotheosis` function checks for `passives.some(p => p.name === 'Arcane Apotheosis')`. If the passive is built correctly, it should have `name: 'Arcane Apotheosis'` from `feature.name` in the handler.

## Notes

- The feature is displayed correctly in the character's Special Actions section (UI shows "Arcane Apotheosis: While your Innate Sorcery feature is active...")
- Innate Sorcery activation works correctly (buff present, SP cost +1, spell advantage)
- The `Sorcery Incarnate` note in the MetamagicPopup correctly shows "you can use up to 2 Metamagic options per spell" (from Innate Sorcery)
- The waiver logic in `computeMetamagicCost` and `isAffordable` in MetamagicPopup are correctly implemented - they just never trigger because the passive is missing
