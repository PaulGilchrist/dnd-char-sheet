# Bug: Cleave Weapon Mastery (WM-001) — Attack Total NaN Prevents Cleave Trigger

## Overview

Cleave weapon mastery fails to trigger because the initial Greataxe attack roll produces a NaN total, causing the attack to register as a MISS. Since Cleave's condition requires `lastAttack.hit === true` (attackRollPostDamage.js:313), Cleave never activates.

Additionally, the attack UI displays "NaN vs AC 15" instead of the correct total (e.g., "22 vs AC 15"), and the React console emits: `Received NaN for the %s attribute`.

## Expected Behavior

1. WorldTreeBarbarian (Level 10, Greataxe with Cleave mastery) makes a melee attack against Goblin 2 (AC 15).
2. With Reckless Attack active (Advantage), d20 rolls 19, hit bonus +3 (proficiency +4, STR -1), total should be 22.
3. Attack hits (22 >= 15).
4. Cleave triggers, offering a second target within 5 feet of Goblin 2 and within reach.
5. On Cleave hit, second creature takes weapon damage (1d12) **without** the Strength modifier (-1) added, per rules: "don't add your ability modifier to that damage unless that modifier is negative."

## Actual Behavior

1. Attack rolls d20: 19 (with Advantage).
2. Attack total displays as **NaN** instead of 22.
3. Attack result: **MISS** (NaN vs AC 15) — should be HIT.
4. Cleave never triggers because `lastAttack.hit` is false.
5. No Cleave target selection modal appears.
6. Console error: `Received NaN for the %s attribute. If this is expected, cast the value to a string. children @ react-dom_client.js`

## Steps to Reproduce

1. Navigate to test-campaign → WorldTreeBarbarian character sheet.
2. Enter combat with at least 2 NPC targets (e.g., Goblin 2, Goblin 3).
3. Ensure Reckless Attack is active (it is pre-active on this character).
4. Click on **Greataxe** action in the Actions section.
5. Skip the Brutal Strike modal.
6. Observe the attack result shows "NaN vs AC 15" and "MISS".
7. Observe Cleave does not trigger.

## Likely Location

The NaN originates from the attack hit bonus calculation. In `useCharActionsAttackHandlers.js:67-68`:

```javascript
const effectiveHitBonus = ctx?.hitBonus ?? attack.hitBonus;
rollAttack(attack.name, effectiveHitBonus - exhaustionPenalty, ctx);
```

If `ctx.hitBonus` is NaN (from `buildCtx` / `buildAttackContext`), then `NaN - 0 = NaN`, which propagates to the dice roll total calculation in `DiceRollResult.jsx:77`:

```javascript
const currentTotal = ... (finalRoll + bonus + modifier);
```

Where `bonus` or `modifier` is NaN, making `currentTotal` NaN.

The `buildAttackContext` function (used by `buildCtx`) likely returns a NaN `hitBonus` for this character's Greataxe attack. The issue may be in how the character's Strength modifier (-1) and proficiency bonus (+4) are combined, or in the 2024 ruleset attack context building.

## Notes

- The Cleave **damage calculation logic** itself is correct in `attackRollPostDamage.js:358-360,397`: it strips the ability modifier from the damage formula and passes `0` as the modifier to `rollDamage`.
- The blocking issue is the **attack roll total being NaN**, not the Cleave implementation.
- Character has Strength score 9 (modifier -1), proficiency +4, so hit bonus should be +3.
- D20 roll of 19 + 3 = 22 should easily hit AC 15.
- The character sheet correctly displays "+3" as the hit bonus for Greataxe, but the attack pipeline is not using this value correctly.
