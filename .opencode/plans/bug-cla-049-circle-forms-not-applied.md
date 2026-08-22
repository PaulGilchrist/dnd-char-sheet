# Bug: CLA-049 Circle Forms - Temp HP and AC Override Not Applied at Runtime

## Overview
"Circle Forms" is a Circle of the Moon Druid feature (level 2) that should provide three benefits when Wild Shape is active: CR limit increase, AC override (13 + WIS mod), and Temporary HP (3 × Druid level). The feature text renders correctly on the character sheet, but the actual effects (temp HP and AC override) are not being applied to the runtime data.

## Expected Behavior
When a Circle of the Moon Druid uses Wild Shape, the following should be applied:
- CR limit: Druid level / 3 (rounded down)
- AC override: 13 + Wisdom modifier (if higher than Beast's AC)
- Temporary HP: 3 × Druid level

## Actual Behavior
The "Circle Forms" feature text displays correctly in the Special Actions section. However, the `shape_shift` buff in runtime data does not include the temp HP bonus or AC override. The automation handler for `circle_forms_active` is not implemented in `src/services/automation/` and there is no corresponding target effect definition in `targetEffectDefinitions.js`.

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create or load a 2024 Circle of the Moon Druid (level 2+)
4. Activate Wild Shape
5. Observe that the shape_shift buff is active but does not include temp HP or AC override from Circle Forms

## Likely Location
- `public/data/2024/classes.json:4114` — Circle Forms feature defined with `automation.type: "circle_forms_active"`
- `src/services/automation/` — Missing handler for `circle_forms_active` automation type
- `src/services/combat/conditions/targetEffectDefinitions.js` — Missing target effect definition for circle_forms
- Wild Shape transformation code that should apply Circle Forms buffs

## Notes
- The feature text renders correctly, indicating the data definition is correct
- The `shape_shift` buff exists in runtime data but lacks the Circle Forms-specific bonuses
- This appears to be a missing automation handler implementation rather than a data issue
