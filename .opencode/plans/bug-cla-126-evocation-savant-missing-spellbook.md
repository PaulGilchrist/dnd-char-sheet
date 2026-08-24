# Bug: CLA-126 Evocation Savant Spells Not Added to Spellbook

## Overview

The Evocation Savant class feature for the Wizard (School of Evocation) is missing from the spell calculation logic. While the other three Savant features (Abjuration, Divination, Illusion) correctly read the runtime selection and add those spells to the spellbook as "Always" prepared, Evocation Savant is completely absent from `spellCalc2024.js` and `spellCalc.js`.

## Expected Behavior

When a Wizard (School of Evocation) selects two Evocation school spells (level 0-2) via the Evocation Savant modal, those spells should be added to the character's spellbook as "Always" prepared, identical to how Abjuration, Divination, and Illusion Savant work.

## Actual Behavior

The Evocation Savant selection is stored in runtime (`_Evocation_Savant_selection`) and the free-cast tracking reset on rest works correctly (`restRules-shortRest.js:130-142`), but the spells are never added to `spellAbilities.spells` in the spell calculation. The character's spellbook does not include the Evocation Savant spells.

## Steps to Reproduce

1. Create a 2024 Wizard (School of Evocation) character.
2. During class feature selection, the Evocation Savant modal should appear.
3. Select two Evocation school spells (e.g., "Fire Bolt" and "Mage Hand").
4. Save the character.
5. Open the character's spellbook — the selected Evocation Savant spells are NOT listed.
6. Compare with an Abjuration Savant Wizard (e.g., from School of Abjuration multiclass or 5e ruleset) — those spells DO appear.

## Likely Location

**Primary fix needed:**
- `src/services/rules/core/spellCalc2024.js` — Add Evocation Savant handling after line 353 (after Illusion Savant block), following the same pattern as the other three Savants.
- `src/services/rules/core/spellCalc.js` — Add Evocation Savant handling after the other three Savants (same pattern).

**Already working (no fix needed):**
- `src/services/automation/handlers/class-wizard/SavantHandler.js` — Handler correctly stores `_Evocation_Savant_selection`
- `src/services/automation/index.js` — `PASSIVE_RULE_EFFECTS` includes `evocation_savant`
- `src/services/combat/automation/automationRouter.js` — Case `'evocation_savant'` routes to passives
- `src/services/combat/automation/turnStartEffects.js` — Collects `evocation_savant` turn-start effect
- `src/services/rules/effects/restRules-shortRest.js` — Free cast tracking reset for Evocation Savant works

## Notes

- The test file `spellCalc2024-runtime.test.js` also needs to be updated to include Evocation Savant in the Savant test (currently only tests Abjuration, Divination, Illusion).
- The pattern is identical to the other three Savants: read from `getRuntimeValue(playerStats.name, '_Evocation_Savant_selection', campaignName)`, iterate over the array, and push `{ name: spellName, prepared: 'Always' }` to `spellAbilities.spells`.
