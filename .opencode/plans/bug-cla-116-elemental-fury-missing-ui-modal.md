# Bug: CLA-116 Elemental Fury — Missing UI Modal for Option Selection

## Overview
Elemental Fury (Druid Circle of the Stars feature) has correct backend code for both Potent Spellcasting and Primal Strike, but no UI modal prompts the player to choose between them. The automation silently skips when no choice is stored.

## Expected Behavior
When a Circle of the Stars Druid enters combat or gains a level that grants Elemental Fury, they should be prompted to choose between:
1. **Potent Spellcasting:** Add Wisdom modifier to cantrip damage
2. **Primal Strike:** 1d8 extra damage (Cold/Fire/Lightning/Thunder) on weapon/Beast form hits, once per turn

## Actual Behavior
No UI modal appears to select the option. The automation checks for a stored runtime value `_Elemental Fury_option` and silently skips if it doesn't exist. Players cannot activate Elemental Fury through the UI.

## Steps to Reproduce
1. Create a 2024 Circle of the Stars Druid (level 2+)
2. Enter combat
3. No prompt appears to choose Potent Spellcasting vs Primal Strike
4. Attempting to cast a cantrip or make a weapon attack does not trigger Elemental Fury bonus damage

## Likely Location
- `src/services/combat/automation/handlers/classFeatureHandler.js` — Elemental Fury handler stores choice in `_Elemental Fury_option`
- `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` — builds Elemental Fury info
- Missing: UI modal/prompt component for Elemental Fury option selection
- `src/services/combat/automation/steps/damage.js:241-286` — `damage_bonus` handler correctly reads stored choice
- `src/services/combat/automation/steps/attackRollBonuses.js:187-225` — `buildWeaponHitBonusesStep` correctly processes weapon hits
- `src/services/combat/automation/steps/directSpellDamageSteps.js:168-207` — `buildPotentSpellcastingStep` correctly processes cantrip damage

## Notes
- Backend code for both options is correct and tested
- The missing piece is the UI prompt/modal that lets the player select their preference
- This is a usability bug, not a logic bug — the automation works if the choice is stored manually
