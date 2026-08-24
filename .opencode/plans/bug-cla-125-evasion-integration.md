# CLA-125 Evasion - Integration Bugs

## Overview
The Evasion automation (CLA-125) is correctly defined in the automation router and info builder, but has critical integration bugs in the AOE damage calculation paths. When a Rogue with Evasion makes a DEX save against an AOE spell, evasion is NOT applied — the character takes half damage on success instead of no damage.

## Expected Behavior
Per Rogue Evasion feature (level 7+): When subjected to an effect that allows a Dexterity saving throw to take only half damage, the Rogue takes **no damage** if they succeed and **half damage** if they fail.

## Actual Behavior
**Player saves:** Evasion is completely ignored. Players take half damage on save success regardless of having the Evasion feature.
**NPC saves in AOE:** Evasion is checked against `isCircleOfPowerActive()` instead of actual evasion effects, so no creature ever gets evasion applied.

## Steps to Reproduce

### Setup
1. Load ElusiveRogue (Level 18 Rogue/Thief, DEX 18, 2024 rules) into test-campaign
2. Add Evasion feature with `automation: { type: 'evasion', saveType: 'DEX' }` to character's specialActions
3. Add Aarakocra Aeromancer via Encounter Builder (has Lightning Bolt: DEX save, half damage)
4. Start combat, Aeromancer casts Lightning Bolt targeting ElusiveRogue

### Expected outcome
- DEX save SUCCESS: ElusiveRogue takes **0 damage**
- DEX save FAILURE: ElusiveRogue takes **half damage**

### Actual outcome
- DEX save SUCCESS: ElusiveRogue takes **half damage** (evasion not applied)
- DEX save FAILURE: ElusiveRogue takes **half damage** (correct by default)

## Likely Location

### Bug 1: Player save handler (CRITICAL)
**File:** `src/components/char-sheet/modals/shared/SaveAttackAoeModal.jsx`
**Line:** 214

```js
// CURRENT (WRONG):
const finalDamage = computeDamageAfterSave(rawDamage, success, dcSuccess);

// SHOULD BE:
const targetChar = (combatSummary.creatures?.filter(c => c.type === 'player') || []).find(c => c.name === targetName);
const evasionEffects = targetChar?.computedStats?.evasionEffects;
const normalizedSaveType = normalizeSaveType(saveType);
const evasionActive = hasEvasionForSave(evasionEffects, normalizedSaveType);
const finalDamage = computeDamageAfterEvasion(rawDamage, success, dcSuccess, evasionActive);
```

The `handleSaveResult` callback (lines 202-302) processes player save responses from the `save-result` event. It imports `computeDamageAfterEvasion` and `hasEvasionForSave` (line 6) but never uses them for player saves. The NPC path (lines 82-152) correctly applies evasion using these same functions.

### Bug 2: NPC AOE processing
**File:** `src/services/rules/combat/aoeService.js`
**Line:** 60

```js
// CURRENT (WRONG):
const hasEvasion = isCircleOfPowerActive(creature.name, campaignName);

// SHOULD BE:
const evasionEffects = creature.evasionEffects || [];
const hasEvasion = hasEvasionForSave(evasionEffects, saveType);
```

The `processAoeNpcs` function checks `isCircleOfPowerActive()` for evasion instead of the creature's actual evasion effects. This means evasion is never applied to NPCs (unless Circle of Power happens to be active on them, which is unrelated).

## Notes
- `computeDamageAfterEvasion` function (applyDamage.js:99-105) works correctly: returns 0 on success, half on fail when evasion is active and dcSuccess is 'half'
- `hasEvasionForSave` function (applyDamage.js:93-97) works correctly: checks save type match
- `getEvasionEffects` function (automationService.js:75-93) works correctly: extracts evasion from features
- The automation router (automationRouter.js:172) and info builder (conditional.js:58) correctly handle evasion type
- ElusiveRogue.json currently has `"automation": {}` — no Evasion feature defined (test setup issue, not a code bug)
