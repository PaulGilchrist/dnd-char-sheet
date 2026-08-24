# Bug: CLA-122 — Empowered Spell Reroll Button Not Appearing

## Summary
The Empowered Spell metamagic reroll button does not appear in the damage popup after casting a spell attack (Fire Bolt) that hits a target. The attack roll popup shows correctly (d20 + modifier), but the damage portion with the "Done" button and Empowered Spell reroll option never renders.

## Expected Behavior
When DraconicSorcerer casts Fire Bolt at Bandit 1 and the attack hits:
1. Attack roll popup shows d20 result (e.g., "13 to hit")
2. Damage popup appears with:
   - Damage dice roll result (e.g., "2d10 = X")
   - "Done" button
   - "Empowered Spell (1 SP)" reroll button (when `empoweredSpell && !empoweredSpellUsed && isDamageType`)

## Actual Behavior
1. Attack roll popup shows d20 result (e.g., "11 to hit")
2. **No damage popup appears** after dismissing the attack roll popup
3. No "Done" button, no Empowered Spell reroll button
4. Bandit HP remains unchanged (11/11)

## Evidence

### Character Setup
- **DraconicSorcerer** (Level 6 Sorcerer, Draconic Sorcery)
  - CHA 16 (+3 modifier) → can reroll up to 3 damage dice
  - Sorcery Points: 6/6
  - Has Metamagic action with `reroll_damage_dice` effect (Empowered Spell)
  - Spells: Fire Bolt (2d10 fire damage)

### Code Flow Analysis
1. `handleNoSavePath()` (spellCastService/execution/noSavePath.js:41) calls `rollAttack(spell.name, spellToHit, attackCtx)` with `autoDamageFormula: "2d10"`
2. `useLoggedDiceRollAttack` creates `autoDamage` object from `context.autoDamageFormula` (line 191-214)
3. `setPopupHtml` is called with d20 popup data including `autoDamage` (line 218-284)
4. `DiceRollResult.jsx` should render damage portion when `autoDamage && computedHit` (line 653-659)

### Root Cause Hypothesis
The `computedHit` value is likely `undefined` because either `targetName` or `targetAc` is not being set in the attack context. From `DiceRollResult.computed.js:82`:

```js
const computedHit = isAutoMiss ? false : (targetName && hit !== undefined && targetAc !== undefined ? finalTotal >= effectiveAc : hit);
```

When `targetName` or `targetAc` is missing, `computedHit` falls back to just `hit`, which may also be undefined if `resolveHit` didn't properly resolve the hit/miss.

This causes the condition `autoDamage && computedHit` to be false, so the damage popup portion (including the Empowered Spell button) never renders.

## Files Involved
- `src/services/rules/spells/spellCastService/execution/noSavePath.js` — creates attack context with autoDamageFormula
- `src/hooks/combat/useLoggedDiceRollAttack.js` — rolls d20, creates autoDamage object, sets popupHtml
- `src/components/char-sheet/DiceRollResult.jsx:653-659` — renders damage portion with Empowered Spell button
- `src/components/char-sheet/DiceRollResult.computed.js:82` — computes hit/miss
- `src/services/rules/spells/empoweredSpellService.js` — hasEmpoweredSpell, executeEmpoweredReroll
- `src/components/char-sheet/DiceRollResult.handlers.js:84` — handleEmpoweredSpell

## Steps to Reproduce
1. Load test-campaign
2. Select DraconicSorcerer character
3. Add Bandit via Encounter Builder → Join Encounter
4. Go to Initiative view to confirm Bandit 1 is in combat
5. Go back to DraconicSorcerer character sheet
6. Click Fire Bolt → Cast Spell → Cast Without Metamagic
7. Observe attack roll popup shows d20 result
8. Dismiss attack roll popup
9. **Expected:** Damage popup with Empowered Spell button appears
10. **Actual:** Nothing happens, no damage popup

## Impact
- Empowered Spell metamagic cannot be tested or used in practice
- Players with Sorcerer level 2+ cannot benefit from Empowered Spell reroll
- The feature is implemented in code but the UI trigger path is broken
