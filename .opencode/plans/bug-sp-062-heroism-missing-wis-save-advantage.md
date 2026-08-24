# Bug: SP-062 Heroism — Missing Wisdom Save Advantage

## Summary

The Heroism spell automation (SP-062) applies Frightened immunity and temp HP correctly, but **does not apply Advantage on Wisdom saving throws** as specified in the spell description.

## Spell Description (PHB p.251)

> *2nd-level Enchantment (Bard)*
> *Casting Time: 1 Action*
> *Range: Touch*
> *Duration: Concentration, up to 1 minute*
>
> "You touch a willing creature. For the duration, the target has **Advantage on Wisdom saving throws** and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns."

## What Was Verified (Working)

| Effect | Status | Evidence |
|--------|--------|----------|
| Frightened condition immunity | ✅ PASS | Character sheet shows "Immunities: Frightened" |
| Concentration tracking | ✅ PASS | "Concentration: Heroism (DC 17 Constitution)" displayed |
| Temp HP at turn start | ✅ PASS | Log: "3 temp HP at start of each turn"; `turnStartEffects` with `heroism_temp_hp` registered |
| Active buff stored | ✅ PASS | `activeBuffs` contains `{ name: 'Heroism', conditionImmunity: ['Frightened'], tempHpAmount: 3 }` |
| Target effects stored | ✅ PASS | `targetEffects` contains `{ effect: 'heroism', source: 'Heroism', target: 'Aeralyn' }` |
| Log entry | ✅ PASS | Campaign log entry created |

## What is Missing (BUG)

| Effect | Status | Expected |
|--------|--------|----------|
| **Wisdom Save Advantage** | ❌ **FAIL** | No mechanism adds WIS save advantage to conditionEffects |

## Root Cause

**`src/services/rules/features/heroismService.js`** — The `applyHeroism` function does NOT add any save advantage mechanism. It only:
1. Adds `conditionImmunity: ['Frightened']` to the active buff
2. Adds `heroism_temp_hp` to `turnStartEffects`
3. Stores `heroism` targetEffect (which only tracks Frightened immunity + temp HP)

No modifier is added to grant Advantage on Wisdom saves. Compare with **Foresight spell** (`foresightService.js`) which adds `advantage_saves` targetEffect, or **Haste handler** which adds to `saveAdvantageAbilities`.

## Files Involved

- `src/services/rules/features/heroismService.js` — Missing save advantage logic in `applyHeroism()`
- `src/services/combat/conditions/targetEffectDefinitions.js` — Heroism effect definition (line 425) omits WIS save advantage from description
- `src/services/combat/automation/automationModifiers.js` — Save advantage modifiers use `saveType` field (e.g., `{ saveType: 'WIS', effect: 'advantage' }`)
- `src/services/combat/conditions/conditionEffects.js` — `saveAdvantageAbilities` array tracks per-ability save advantage
- `src/hooks/combat/handlers/handlePlayerSaveDamage.js` — Checks `saveAdvantageAbilities` for save advantage at line 202

## Test Evidence

- **Character tested:** Aeralyn (Bard, College of Valor, Level 20, CHA +3)
- **Target:** Self (Aeralyn)
- **UI observation:** After casting Heroism, character sheet shows "Immunities: Frightened" and "Concentration: Heroism (DC 17 Constitution)" but no WIS save advantage indicator
- **Search results:** No code references to `heroism` combined with `advantage` or `wis` in save context

## Fix Required

Add WIS save advantage to `applyHeroism()` in `heroismService.js`. The fix should add a modifier or targetEffect that grants Advantage specifically on Wisdom saving throws, similar to how other spells grant save advantage. The `saveAdvantageAbilities` array in conditionEffects should include `'WIS'` when Heroism is active.
