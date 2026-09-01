# Bug SP-085 — Pass Without Trace: spell slot never consumed, concentration never tracked, no aura badge

## Title
SP-085 Pass Without Trace (2024 lv2 Ranger/Druid concentration aura): live cast applies the +10 Stealth targetEffect correctly but consumes NO spell slot, tracks NO concentration, and renders NO card/sheet badge; te records wrong slotLevel.

## Overview
Verified E2E in test-campaign via Playwright (dev :5173) with caster **FeyRanger** (2024 Ranger lv15 Fey Wanderer, DEX 8/-1, lv2 slots runtime = 3). The spell is modelled and reachable through the spell-table gate flow and the +10 Stealth consumer works, but the custom confirm path bypasses `prepareSpellCast` entirely, so slot consumption, concentration registration, and buff/badge state are all missing. Per acceptance ("close-but-not-exact = FAIL") this is a FAIL.

## Expected
Casting Pass Without Trace (2024 spells.json `pass-without-trace`, lv2, Action, Self, Concentration up to 1 hour, `automation:{type:'pass_without_trace',auraRange:30}`):
1. One lv2 spell slot consumed (`FeyRanger.spell_slots_level_2` decrements).
2. Concentration tracked (combatSummary `creature.concentration {spell:'Pass Without Trace'}` and/or caster `activeBuffs` entry — cf. SP-071 Invisibility / CLA-224 Mantle of Majesty precedent).
3. Aura badge ("Pass Without Trace", fa-wind, registry `targetEffectDefinitions.js:623`) visible on caster/target sheets/initiative cards.
4. +10 Dexterity (Stealth) bonus modelled on affected targets (works).
5. te should record `slotLevel:2`.

## Actual
1. **NO slot consumed**: pre-cast popup "Slots Remaining: 3 slots"; change-data `FeyRanger.spell_slots_level_2` = **3 before AND after** the cast (3→3), verified ≥13 s post-cast.
2. **NO concentration tracked**: caster `activeBuffs` key absent in change-data; combatSummary FeyRanger/HeroesFeastBard `concentration` absent; no concentration prompt.
3. **NO badge**: FeyRanger initiative card badges = `[]`, HeroesFeastBard = `[]`; sheet `.creature-badge` scan found only unrelated Inner Radiance. Registry definition exists but has no badge-render consumer (`pass_without_trace_bonus` never appears in `CharActionSpellPopups/ConditionEffectBadges/CharSummary` component code).
4. +10 **WORKS** (the one passing leg): campaign top-level `targetEffects` persists
   `[{"target":"FeyRanger","effect":"pass_without_trace_bonus","source":"FeyRanger","slotLevel":1,"duration":"concentration","bonusExpression":"+10"},{"target":"HeroesFeastBard",…}]`;
   sheet Stealth cell flips **(-1) → (+9)** (DEX −1 + 10; sibling Sleight of Hand stays −1 = same-DEX differential), Stealth roll popup "d20 1 +9 (+9 to hit)", log `roll Stealth bonus:9`.
5. te `slotLevel` = **1** (spell is lv2) — cosmetic telemetry bug.
Cast popup + logs themselves are correct: "Pass Without Trace cast: 2 creature(s) affected — FeyRanger, HeroesFeastBard. Each has +10 to Dexterity (Stealth) checks and leaves no tracks." + `spell` log "FeyRanger casts Pass Without Trace on FeyRanger, HeroesFeastBard." + `automation` log.

## Steps
1. test-campaign, FeyRanger with `spells:['Pass Without Trace']` (prepared via Edit-wizard Spells step, `.list-item-checkbox-trigger` tick + `✓ Save`, disk ground truth after 15 s).
2. FeyRanger sheet → Spells table row "Pass Without Trace" → SpellDetailPopup ("Slots Remaining: 3 slots") → **Cast Spell**.
3. `.sp-overlay` CreatureSelectionModal "Pass Without Trace" (fa-ghost) → tick FeyRanger + HeroesFeastBard checkboxes → **Cast Pass Without Trace**.
4. Dismiss result popup; wait ≥13 s; fetch `/api/campaigns/test-campaign/change-data`.
5. Observe: te written (top-level `targetEffects`), slot unchanged, no concentration, no badge.
6. Abilities table → Stealth cell "(+9)" → auto-rolls "d20 1 +9" (+10 leg verified).

## Likely Location
- `src/hooks/combat/useSpellMetamagicGates.js:28-35` — `tryGateSpell` returns handled=true for `'pass without trace'` (`spellGates.js:362-369` gate sets `pending('passWithoutTrace')` only) and `gateMetamagic` **returns before `prepareSpellCast` at :117** → no slot spend, no concentration write, no upcast/slot bookkeeping. This is the root cause of legs 1+2.
- `src/hooks/combat/useSpellMetamagicFlow/useCustomHandlers.js:49-77` `handlePassWithoutTraceConfirm` — custom confirm does log + `applyPassWithoutTraceEffect` but never calls `prepareSpellCast` (contrast the generic `createConfirmHandler` in `useConfirmableFlow.js:78-90` used by longstrider/mage-armor which DOES consume the slot). The Skip handler also has no `rollbackSpellSlot` (moot while nothing spends).
- `src/services/rules/features/passWithoutTraceService.js:37` — `applyPassWithoutTraceEffect(spell=…)` receives the `{name, spell}` wrapper and computes `slotLevel = spell.level || 1` on the WRAPPER (no `level` key) → te `slotLevel:1` instead of 2.
- Badge gap: `pass_without_trace_bonus` is in the registry (`targetEffectDefinitions.js:623-631`) but no badge renderer branch consumes it (`ConditionEffectBadges.jsx`/`CharSummary.jsx`/initiative cards).
- Dead parallel path (do not "fix" here): `handlers/buffs/passWithoutTraceHandler.js` (`toggleBuff` + `pass_without_trace_target_selection` popup) and `triggerPassWithoutTraceSpell` have ZERO live callers; `automationRouter.js:647` bins `pass_without_trace` into inert passives.

## Notes
- Concentration-break test intentionally skipped: there is no tracked concentration state to break (legs 1-2 fail first).
- +10 consumer chain confirmed live: `conditionEffects.js:605` → `CharAbilities.jsx:95-96` skill bonus + `useCharActionsBaseActions.js:50-51` (Hide action bonus). te cleanup paths exist (`useInitiativeEffects.js:279`, short/long rest filters) but with no concentration tracking the 1-hour/concentration duration is only encounter-cleared in practice.
- 2024 class attribution verified: `public/data/2024/spells.json` classes = [Druid, Ranger]; both registry casters qualify; FeyRanger chosen (lv15 Ranger).
- Cleanup done post-run: no EB monsters were added (PC ally target only); Admin Clear Change Data + Clear Campaign Log executed; FeyRanger LEFT with Pass Without Trace prepared (disk spells[] ground truth).
- 2024 lv15 Ranger lv2-slot max in this dataset appears to be 3 (runtime seed), so "3→3" is judged on unchanged-across-cast, not against RAW 4.
