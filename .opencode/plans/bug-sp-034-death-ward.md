# Bug: SP-034 Death Ward Missing Advantage on Saves and Disadvantage on Attacks

## Overview

The Death Ward spell automation (SP-034) only implements the HP protection feature (reducing to 1 HP instead of 0). It is missing two other expected behaviors from the spell description: Advantage on saving throws against being reduced to 0 HP, and Disadvantage on attack rolls when attacks are made against the target.

## Expected Behavior

Level 1 Abjuration (Cleric) Casting Time: Action Range: Touch Components: V, S Duration: 8 hours

For the duration, the target has:
1. **Advantage on saving throws against being reduced to 0 Hit Points**
2. **When attacks are made against the target, the attacker has Disadvantage on the attack roll**
3. **If an effect would reduce the target to 0 Hit Points, it instead is reduced to 1 Hit Point instead**

## Actual Behavior

Only feature #3 is implemented. Features #1 and #2 are completely absent from the automation code.

### Feature #1 - Advantage on Saves (MISSING)
No code exists that checks for Death Ward buff and grants Advantage on saving throws against being reduced to 0 HP. The save calculation pipeline has no Death Ward integration point.

### Feature #2 - Disadvantage on Attacks (MISSING)
No code exists that checks for Death Ward buff and applies Disadvantage to attack rolls against the target. The attack roll pipeline has no Death Ward integration point.

### Feature #3 - HP Protection (IMPLEMENTED)
`checkDeathWard()` in `deathWardService.js` correctly sets HP to 1 when the target would drop to 0 HP, removes the buff, resets death saves, and clears unconscious condition.

## Steps to Reproduce

1. Create a 2024 Cleric character with Death Ward spell prepared in test-campaign
2. Add a Goblin creature to the combat encounter
3. Cast Death Ward on the Goblin (adds `activeBuffs` entry with `name: "Death Ward"`, `effect: "death_ward"`)
4. Make an attack roll against the Goblin - the attack roll does NOT receive Disadvantage from Death Ward
5. Make a save against an effect that would reduce the Goblin to 0 HP - the save does NOT receive Advantage from Death Ward
6. Deal damage that would reduce the Goblin to 0 HP - the HP correctly drops to 1 and Death Ward buff is consumed

## Likely Location

**Files to modify:**

1. **`src/services/rules/combat/applyDamage.js`** (line ~457) - Death Ward check already exists here for HP protection. Need to add pre-damage logic for attack disadvantage and save advantage earlier in the pipeline.

2. **`src/services/automation/routers/`** or attack/save calculation modules - Need to inject Death Ward advantage/disadvantage into the d20 roll calculation before the roll is made. Look at how other buffs like `bless`, `bane`, or `protection_from_evil_and_good` modify rolls.

3. **`src/services/rules/features/deathWardService.js`** - Currently only handles HP protection. May need to export helper functions for the advantage/disadvantage checks.

**Reference implementations for advantage/disadvantage injection:**
- `protectionFromEvilAndGoodHandler.js` - applies disadvantage to attack rolls against warded target
- `blessHandler.js` / `baneHandler.js` - apply advantage/disadvantage to save rolls
- `compelledDuelHandler.js` - applies disadvantage to attacks against the duelist

## Notes

- The 2024 ruleset Death Ward spell definition in `public/data/2024/spells.json` only describes the HP protection: "The first time the target would drop to 0 Hit Points before the spell ends, the target instead drops to 1 Hit Point, and the spell ends." This differs from the 5e version which includes the advantage/disadvantage features.

- If the intent is to implement the 5e version of Death Ward regardless of ruleset, all three features should be added.

- If the intent is to implement the 2024 ruleset version only, the expected behavior description should be updated to match (only HP protection, no advantage/disadvantage).

- The `deathWardHandler.test.js` and `deathWardService.test.js` unit tests only cover the HP protection behavior and do not test for advantage/disadvantage on saves or attacks.
