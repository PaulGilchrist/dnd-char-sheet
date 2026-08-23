# Bug: CLA-075 Darkvision - Automation Files Don't Exist

## Overview

Darkvision is described as a `classFeature` automation type with handler, router, and infoBuilder files. These files do not exist anywhere in the codebase. Darkvision is actually a **race trait** processed as a **passive sense**, not an automation feature.

## Expected Behavior

Per the automation spec, Darkvision should:
- Be implemented as a `classFeature` automation type
- Have handler at `src/services/combat/automation/handlers/classFeatureHandler.js`
- Have router at `src/services/combat/automation/routers/classFeatureRouter.js`
- Have infoBuilder at `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`
- Be a passive feature (Always active)
- Allow creatures to see in dim light as bright light within 60ft (or 120ft for some races), and darkness as dim light
- Affect vision in combat so creatures in darkness/dim light are properly detected

## Actual Behavior

1. **The three files listed in the spec do not exist:**
   - `src/services/combat/automation/handlers/classFeatureHandler.js` - NOT FOUND
   - `src/services/combat/automation/routers/classFeatureRouter.js` - NOT FOUND
   - `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` - NOT FOUND

2. **Darkvision is processed as a passive sense, not an automation:**
   - Race rules (`src/services/character/race-rules/2024.js:152-158`, `src/services/character/race-rules/5e.js:100-103`) scan racial traits for "darkvision" in the description and add `{ name: 'Darkvision', value: '60 ft.' }` to the character's `senses` array
   - The racial trait has NO `automation` metadata (unlike Fey Ancestry which has `automation: { type: 'conditional_advantage', ... }`)
   - The automation collector (`automationCollector.js`) only processes features with `.automation` data

3. **Darkvision is NOT used in combat visibility checks:**
   - The context builder (`contextBuilder-sync.js:573-575`) checks for `blindsight` and `truesight` in senses but does NOT check for `Darkvision`
   - No code path in the combat system uses the Darkvision sense value to determine visibility in darkness or dim light
   - The `isWithinRange` function (`src/services/rules/combat/rangeCheck.js`) only checks distance, not vision/lighting conditions

4. **Darkvision enhancements exist but are narrow:**
   - `senseUtils.js` has `applyThirdEyeDarkvision` and `applyUmbralSightDarkvision` for specific class features
   - These only modify the Darkvision range, they don't implement vision detection

5. **The only Darkvision references in the automation system:**
   - `automationInfoBuilder/core-handlers.js:579` - The Third Eye monk feature (not racial Darkvision)
   - `automation/handlers/class-wizard/thirdEyeHandler.js:82` - The Third Eye handler

## Steps to Reproduce

1. Create a 2024 Elf character in "test-campaign" (has Darkvision 60 ft racial trait)
2. File created: `public/campaigns/test-campaign/DarkvisionTest.json`
3. Race rules process the trait and add `Darkvision: 60 ft.` to the character's `senses` array
4. The automation collector does NOT process it (no `.automation` field on the trait)
5. No handler, router, or infoBuilder exists for Darkvision
6. The combat system does NOT use Darkvision for visibility checks in darkness/dim light

## Likely Location

Darkvision needs to be implemented as a passive automation if it is to affect combat visibility:

1. **Race trait data** (`public/data/2024/races.json`): The Darkvision trait needs an `automation` field added, e.g.:
   ```json
   {
     "name": "Darkvision",
     "description": "You have darkvision with a range of 60 feet.",
     "automation": {
       "type": "passive_buff",
       "effect": "darkvision",
       "range": "60"
     }
   }
   ```

2. **Handler** (`src/services/combat/automation/handlers/`): New handler to collect darkvision as a passive buff

3. **Router** (`src/services/combat/automation/routers/`): New router to route darkvision automation to passives

4. **InfoBuilder** (`src/services/combat/automation/infoBuilders/`): New infoBuilder to build darkvision attack info

5. **Context builder** (`src/services/automation/contextBuilder-sync.js`): Add Darkvision check alongside blindsight/truesight for visibility in darkness

## Notes

- Test character created: `DarkvisionTest.json` (2024 Elf Fighter, level 1)
- The 2024 Elf race has the Darkvision trait with description "You have darkvision with a range of 60 feet."
- The race rules correctly parse this and add it to the senses array
- The gap is that Darkvision is a passive sense but is NOT used by the combat system for visibility calculations
- Other races with Darkvision in 2024: Aasimar (60ft), Dragonborn (60ft), Dwarf (120ft), Gnome (60ft), Orc (120ft), Tiefling (60ft)
- Drow lineage and Deep Gnome lineage override to 120 ft (handled in `2024.js:187-212`)
