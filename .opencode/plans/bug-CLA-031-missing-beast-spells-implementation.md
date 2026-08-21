# Bug: CLA-031 Beast Spells - No Implementation

## Overview

The "Beast Spells" class feature (CLA-031) for Druid level 18 is declared in the 2024 class data as a `passive_rule` with `effect: "beast_spells"`, but there is no code anywhere in the source that implements its behavior. The effect is collected into the player's automation passives but never checked during spell casting.

## Expected Behavior

"While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component."

Specifically, when a Druid is in Wild Shape:
- Verbal (V) components should be waived (no silence check needed)
- Somatic (S) components should be waived (no material component needed for S)
- Material (M) components WITHOUT a gold cost specified should be waived
- Material (M) components WITH a gold cost specified or that are consumed should NOT be waived

## Actual Behavior

The "beast_spells" effect is:
1. Declared in `public/data/2024/classes.json` (line 3766-3773) as a level 18 Druid feature with `automation: { type: "passive_rule", effect: "beast_spells" }`
2. Also declared in `public/data/classes.json` (5e, line 4213-4220) with the same structure
3. Collected by `automationCollector.js` into `result.passives` via the default `passive_rule` routing in `automationRouter.js` (line 207-208)
4. Displayed in the UI under Special Actions (visible on the character sheet)
5. **NO CODE in the entire `src/services/` directory checks for `beast_spells`** - zero matches in grep

The spell casting pipeline (`spellCastService/execution/index.js`) does not check for the `beast_spells` passive, so:
- Spell casting in Wild Shape is not affected at all
- V/S/M component checks proceed normally regardless of Wild Shape state
- There is no waiver of any components while in beast form

## Steps to Reproduce

1. Create a 2024 Druid character at level 18 (Circle of the Moon) in the "test-campaign"
2. Activate Wild Shape (bonus action)
3. Attempt to cast a spell with V and S components (e.g., "Guidance" with V/S)
4. Observe: The spell cast proceeds normally without any component waiver
5. Attempt to cast a spell with M components without cost (e.g., "Light" with V/M)
6. Observe: The spell cast proceeds normally without any component waiver
7. The Beast Spells feature should waive V, S, and M (no cost) components while in Wild Shape, but it does not

## Likely Location

The bug is a **missing implementation**, not a broken one. The following files need to be modified:

1. **`src/services/combat/automation/automationPassives.js`** - Add a `hasBeastSpells(playerStats)` function similar to existing patterns like `hasSomaticComponentWaiver(playerStats)` at line 321-323.

2. **`src/services/combat/automation/automationInfoBuilder/passive.js`** - Add a handler for `beast_spells` effect in the `passiveHandlers` object (already has handlers for `ritual_spells`, `supreme_sneak`, `umbral_sight`, etc.)

3. **`src/services/combat/automation/automationRouter.js`** - Add a case for `beast_spells` in the `routeAutomation` switch (line 195-213 handles `passive_rule` but has no special case for `beast_spells`)

4. **`src/services/rules/spells/spellCastService/execution/index.js`** - Add checks in the spell execution flow (around lines 87-102 where V component silence check and Psychic Spells component reduction happen) to waive V/S/M components when `hasBeastSpells(playerStats)` is true and the player is in Wild Shape.

5. **`src/services/rules/spells/spellPreparationService.js`** - May need to check for beast_spells when processing material components.

## Notes

- The `hasSomaticComponentWaiver` function at `automationPassives.js:321-323` checks for `somatic_component_waiver` effect but this effect is never set anywhere in the codebase. This may be a related but separate feature.
- The 5e version of Beast Spells (classes.json line 4216) has a slightly different description: "You can cast many of your druid spells in any shape you assume using Wild Shape. You can perform the somatic and verbal components of a druid spell while in a beast shape, but you aren't able to provide material components." This is similar but explicitly mentions only V/S waiver (not M waiver).
- The 2024 version (classes.json line 3767) says: "While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component." This implies V, S, and M (no cost) are all waived.
- The TestDruid character was created in test-campaign at level 18 Druid (Circle of the Moon) with the Beast Spells feature visible in Special Actions, confirming the data is correct.
- The automation is properly collected into passives (visible in UI) but the behavioral hook is missing.
