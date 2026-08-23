# Bug: CLA-076 - Dazzling Footwork (Oath of Glory Paladin) Missing

## Overview

The Dazzling Footwork feature for the Oath of Glory Paladin (level 6+) does not exist in the codebase. The feature has no data definition, no automation handler, no router entry, and no info builder. The referenced source files (`classFeatureHandler.js`, `classFeatureRouter.js`, `classFeatureInfoBuilder.js`) do not exist at the specified paths.

## Expected Behavior

When a creature within 5 feet of a level 6+ Oath of Glory Paladin misses with an attack roll, the Paladin should be offered Dazzling Footwork as a reaction option. On use:

1. The target makes a Wisdom saving throw (DC = Paladin's spell save DC)
2. On a failed save, the target has Disadvantage on its next attack roll before the end of the target's next turn
3. Uses equal to Charisma modifier (minimum of once)
4. All expended uses regained after a Long Rest

## Actual Behavior

The feature does not exist. The Oath of Glory Paladin's subclass features in `public/data/2024/classes.json` (lines 7649-7773) contain only:

- Inspiring Smite (level 3)
- Peerless Athlete (level 3)
- Aura of Alacrity (level 7)
- Glorious Defense (level 15)
- Living Legend (level 20)

**Dazzling Footwork is entirely absent.**

## Steps to Reproduce

1. Create a 2024 ruleset Paladin level 6 with Oath of Glory subclass in "test-campaign"
2. Start a combat encounter with an enemy creature within 5 feet
3. Have the enemy miss the Paladin with a melee attack
4. Observe that no Dazzling Footwork reaction option appears
5. Check the character's available reactions - Dazzling Footwork is not listed
6. Check `public/data/2024/classes.json` - the feature is not defined in the Oath of Glory subclass features array
7. Check `src/services/automation/index.js` HANDLER_MAP - no entry for dazzling_footwork
8. Check `src/services/combat/automation/automationRouter.js` - no case for dazzling_footwork
9. Check `src/services/combat/automation/automationInfoBuilder/class-feature-handlers.js` - no handler for dazzling_footwork

## Likely Location

This feature needs to be implemented across three locations:

1. **Data definition**: `public/data/2024/classes.json` - Add Dazzling Footwork feature to the Oath of Glory subclass features array at level 6, with automation type (e.g., `dazzling_footwork`)
2. **Automation handler**: `src/services/automation/handlers/class-cleric-paladin/dazzlingFootworkHandler.js` - New handler file implementing:
   - Resource pool check (Charisma modifier uses, min 1)
   - Wisdom save DC calculation
   - Target effect application (disadvantage on next attack)
   - Long rest recharge
3. **Automation index**: `src/services/automation/index.js` - Import and register handler in HANDLER_MAP
4. **Automation router**: `src/services/combat/automation/automationRouter.js` - Add case for `dazzling_footwork` routing to reactions
5. **Info builder**: `src/services/combat/automation/automationInfoBuilder/class-feature-handlers.js` - Add info builder for dazzling_footwork automation type

## Notes

- The only "Dazzling Footwork" in the codebase is for College of Dance Bard at `public/data/2024/classes.json:1856`, which is a completely different feature (passive AC calculation and unarmed strike damage)
- The task's referenced source files (`src/services/combat/automation/handlers/classFeatureHandler.js`, `src/services/combat/automation/routers/classFeatureRouter.js`, `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`) do not exist - the actual automation architecture uses `automationRouter.js`, `automationInfoBuilder.js`, and individual handler files
- A test character (GloryPaladin.json) was created in test-campaign but the automation cannot be triggered because the feature has no implementation
