# Bug: CLA-022 — Aura of Warding resistances not applied during damage calculation

## Overview

Aura of Warding (Paladin level 7, 2024 rules) grants Resistance to Necrotic, Psychic, and Radiant damage to the Paladin and allies within Aura of Protection range. The resistances are correctly extracted by `computeAuraComboEffects` and displayed in the character sheet UI, but they are **never applied during combat damage calculation**. When a creature takes Necrotic, Psychic, or Radiant damage while within Aura of Protection range, the damage is NOT halved.

## Expected Behavior

When a creature (Paladin or ally) takes Necrotic, Psychic, or Radiant damage while within Aura of Protection range, the damage should be halved (resistance applied). This should happen automatically during `applyDamageToTarget` in the combat pipeline.

## Actual Behavior

The resistances are displayed in the UI with a `*` marker (e.g., "Radiant*"), but when damage is dealt in combat, the resistances from `computeAuraComboEffects` are completely ignored. Damage is dealt at full value instead of half.

## Steps to Reproduce

1. Navigate to "test-campaign" in the app
2. Select the "PaladinAuraTest" character (level 18 Paladin, Oath of Devotion, 2024 rules)
3. Verify the character has Aura of Protection and Aura of Warding features (level 7+)
4. Cast a spell or make an attack that deals Radiant, Necrotic, or Psychic damage to an ally within 10ft of the Paladin
5. Observe that the full damage is applied instead of half damage

Example: The Paladin has Guardian of Faith (20 Radiant damage) or Divine Smite (2d8 Radiant). When these deal damage to an ally in range, the ally should take 10 Radiant (or 1d8) instead of 20 (or 2d8).

## Likely Location

The root cause is in `src/services/rules/combat/applyDamage.js`:

- `applyDamageToTarget()` (line ~116) collects resistances from three sources:
  1. `playerComputed.resistances` or `creature.resistances` (base resistances)
  2. `getDamageResistances()` — only extracts from `passive_immunity` with `damageResistance` field
  3. `activeBuffs` with `resistanceTypes` field

- **Missing**: `applyDamageToTarget` never calls `computeAuraComboEffects()` to get aura-based resistances from Aura of Warding.

The resistances ARE correctly computed in:
- `src/services/combat/auras/auraComboEffects.js` — `computeAuraComboEffects()` correctly extracts `resistances` from "Aura of Warding" passives (line 46-48)

The resistances ARE correctly displayed in:
- `src/components/char-sheet/char-summary/charSummaryCalc.js` — `computeCharSummaryContext()` merges aura resistances for display (line 104-105)
- `src/components/char-sheet/CharSummary.jsx` (line 329-337) — displays resistances with `*` aura marker

The fix should integrate `computeAuraComboEffects` into the damage calculation flow, or have `applyDamageToTarget` call it to include aura resistances in the resistance list passed to `computeDamageAfterResistancesWithDetails`.

## Notes

- The manifest references handler/router/infoBuilder files (`classFeatureHandler.js`, `classFeatureRouter.js`, `classFeatureInfoBuilder.js`) that do not exist in the codebase. The actual implementation uses the generic automation router (`automationRouter.js`) and passive handlers (`passive.js`).
- The `passive_buff` type with `resistances` array is correctly handled by the passive info builder (`passive.js` line 40: `resistances: auto.resistances || []`).
- The `getDamageResistances()` function in `automationPassives.js` (line 271-279) only extracts from `passive_immunity` with `damageResistance`, not from `passive_buff` with `resistances`. This is a separate gap but not the primary issue for Aura of Warding.
- The `computeAuraComboEffects` function requires the source to have Aura of Protection (checked via `hasAuraOfProtection`), not be incapacitated, and the target to be an ally within range.
- The test character "PaladinAuraTest" is a level 18 2024 Paladin (Oath of Devotion) with Aura of Protection (30ft) and Aura of Warding.
