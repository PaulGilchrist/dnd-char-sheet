# Bug: SP-003 Animal Shapes - Manifest Paths Incorrect and Spell Data Missing Automation Field

## Overview

Verification of Animal Shapes spell automation (SP-003) against `docs/automations-manifest.json` found two issues:
1. The manifest references non-existent files for handler, router, and infoBuilder paths
2. The spell data in both 5e and 2024 rulesets lacks the `automation` field needed for generic automation routing

The spell automation itself is fully functional via the metamagic flow, but the manifest documentation is incorrect.

## Expected Behavior

According to `docs/automations-manifest.json` SP-003:
- Handler should be at `src/services/combat/automation/handlers/spellHandler.js`
- Router should be at `src/services/combat/automation/routers/spellRouter.js`
- InfoBuilder should be at `src/services/combat/automation/infoBuilders/spellInfoBuilder.js`
- Spell data should have `automation.type` field for routing

Actual expected behavior per spell description:
- Level 8 Transmutation (Druid), Action, 30 feet, V/S, 24 hours duration
- Transform willing creatures into Large or smaller Beast (CR 4 or lower)
- Replace game statistics while retaining creature type, HP, HP Dice, alignment, communication, Int/Wis/Cha scores
- Grant temporary hit points equal to the beast's HP
- Lasts for duration or until target ends as Bonus Action

## Actual Behavior

**Manifest path issue (FAIL):**
- `src/services/combat/automation/handlers/spellHandler.js` — **FILE DOES NOT EXIST**
- `src/services/combat/automation/routers/spellRouter.js` — **FILE DOES NOT EXIST**
- `src/services/combat/automation/infoBuilders/spellInfoBuilder.js` — **FILE DOES NOT EXIST**

**Actual routing paths:**
- Handler: `src/services/automation/handlers/spells/animalShapesHandler.js` (imported at `src/services/automation/index.js:221`, registered in `HANDLER_MAP` at line 530 as `animal_shapes`)
- Gate: `src/hooks/combat/spellGates.js` line 107 (`gateAnimalShapes`), registered in `spellGateMap` at line 648
- Complex handlers: `src/hooks/combat/useSpellMetamagicFlow/useComplexSpellHandlers.js` (`handleAnimalShapesTargetConfirm`, `handleAnimalShapesBeastConfirm`)
- Modal: `src/components/char-sheet/modals/AnimalShapesSelectionModal.jsx`
- Service: `src/services/automation/handlers/spells/animalShapesService.js`

**Spell data issue (FAIL):**
- `public/data/2024/spells.json` — Animal Shapes entry has NO `automation` field
- `public/data/spells.json` (5e) — Animal Shapes entry has NO `automation` field
- Other spells (e.g., Animate Dead) have `"automation": { "type": "animate_dead" }`

**Functional verification (PASS):**
- The spell is fully functional through the metamagic flow
- Target selection modal works correctly
- Beast transformation applies correct stats (maxHp, ac, speed from beast)
- Temporary hit points granted equal to beast's HP
- Revert functionality restores original stats
- `animal_shapes` effect properly tracked in targetEffects
- Rest cleanup removes animal_shapes effects
- Expiration cleanup handles animal_shapes
- 56 related tests all pass

## Steps to Reproduce

1. Open `docs/automations-manifest.json` and find SP-003 (Animal Shapes)
2. Verify handler path `src/services/combat/automation/handlers/spellHandler.js` — file does not exist
3. Verify router path `src/services/combat/automation/routers/spellRouter.js` — file does not exist
4. Verify infoBuilder path `src/services/combat/automation/infoBuilders/spellInfoBuilder.js` — file does not exist
5. Open `public/data/2024/spells.json`, find animal-shapes entry — no `automation` field present
6. Run `npm run test:run -- animalShapes` — all 56 tests pass

## Likely Location

1. **Manifest update needed**: `docs/automations-manifest.json` — update handler/router/infoBuilder paths to reflect actual Animal Shapes implementation paths
2. **Spell data update needed**: `public/data/2024/spells.json` and `public/data/spells.json` — add `"automation": { "type": "animal_shapes" }` to the animal-shapes entry for consistency with other spells that have automation routing

## Notes

- Animal Shapes is handled through the **metamagic flow** (`useSpellMetamagicFlow`), not the generic automation handler path. This is because it requires a multi-step interaction: target selection → beast selection → transformation.
- The manifest's handler/router/infoBuilder paths appear to be generic placeholders used for ALL spell entries. Only a few spells (like Animal Friendship) have `verified: "verified"` status despite these incorrect paths.
- The spell data lacking an `automation` field is by design for Animal Shapes since it routes through the metamagic gate (`gateAnimalShapes`) rather than `handleGenericAutomation`.
- The spell correctly implements all expected behaviors from the rules description:
  - CR 4 or lower limit enforced in handler (`ANIMAL_SHAPES_MAX_CR = 4`)
  - Size filtering (Small/Large) enforced in handler (`ALLOWED_SIZES = ['Small', 'Large']`)
  - Multiple target support via `targetBeastMap` parameter
  - Concentration tracking via `animalShapesConcentrationActive` and `animalShapesConcentrationDc`
  - Temporary HP properly tracked and cleaned up on revert
  - Log entries created for both transformation and revert
