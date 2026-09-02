# Bug SP-092 — Prismatic Spray ignores confirmed cone targets; hits every creature in initiative

## Overview
Verified SP-092 E2E 2026-09-01. DivinationWizard (lv20 Evoker, DC 17) cast Prismatic Spray via sheet → "Cast Spell" → "Choose creatures in the cone" popup → ticked ONLY Zombie 1, Zombie 2, Archmage 1, Archmage 2 → "Cast Prismatic Spray (4)". The cast then queued **22 saving-throw prompts** and applied rays to **all 19 non-caster initiative creatures** (15 PCs + 4 EB monsters). War_Cleric (PC, unchecked) dropped to 0 HP and needed a death save (nat-20 stabilized). The confirmation popup's selection is silently discarded.

## Expected
`handlePrismaticSprayConfirm` (src/hooks/combat/useSpellMetamagicFlow/useSimpleSpellHandlers.js:528) passes `onExecute(spell, { selectedTargets: [...] })`; `prismaticSprayHandler.js:206` consumes `action.metaCtx.selectedTargets` — only the 4 confirmed targets should be affected.

## Actual
`handleGenericAutomation` (src/services/rules/spells/spellCastService/execution/triggerSpells.js:453) constructs the action with a hardcoded `metaCtx: {}` and never forwards the caller's metaCtx, so the handler falls back to `cs.creatures` (all combatants). Evidence (campaign log + change-data):
- 22 ability_use ray entries "casts Prismatic Spray! X hit by <Color> ray (rolled N) — DEX save (DC 17)…" for every initiative creature.
- hp_change collateral on unchecked PCs: AasimarTest −15, ArcaneTricksterTest −18, Divine_Cleric −19, DraconicDragon −26, DraconicSorcerer −17, ElderPaladin −23, GoliathFireGiant −17, HeroesFeastBard −16, HexWarlock −28, LightfootHalfling −15, War_Cleric −16 + −29 (→ 0 HP death save), Wild_Sage_Druid −30.
- `Disciplined_Monk` (PC, unchecked) gained `activeConditions:['restrained']` + te `prismatic_spray_indigo` + `_prismaticSprayIndigo_Disciplined_Monk {successes:0,failures:0}` — a PC left Restrained by a spray the GM aimed only at monsters.

## What IS implemented correctly (measured on the 4 intended targets)
- 1d8 ray roll per target incl. Special-8 reroll: Zombie 2 "rolled 8, then 2d7 (1,5)" → Red+Blue (mapping table exact for all 22 rolls: 1 Red/2 Orange/3 Yellow/4 Green/5 Blue/6 Indigo/7 Violet).
- Damage: failed saves dealt fresh full 10d6 typed (Archmage 1 −27 fire; Zombie 1 −15 lightning capped; Zombie 2 −15 capped red+blue); save-successes dealt halved 10d6 (range ≤30 on all 12 saves; e.g. ElderPaladin −23, DraconicSorcerer −17); save bonuses matched combatSummary saveBonuses exactly (Zombie −2, Archmage +2).
- Violet fail (Archmage 2): `activeConditions:['blinded']` + te `prismatic_spray_violet {dc:17,source:DivinationWizard}` + `_prismaticSprayViolet_Archmage_2` tracking + WIS-next-turn note; no damage. Violet/Indigo saves succeeded on EvasiveFighter/FeyRanger → no conditions applied.
- Indigo fail (Monk): Restrained + `activeConditionMeta.restrained{dc:17,ability:'con'}` + `{successes:0,failures:0}` pending structure + condition log.
- Slot: `spell_slots_level_7` 2→1 — exactly one lv7 slot consumed (pre-count 2 was a stale runtime baseline above the lv20 max of 1; consumption itself exact). Concentration not involved.

## Steps to reproduce
1. test-campaign, Initiative has 16 PCs. EB-join Zombie ×2 + Archmage ×2, Join Encounter.
2. DivinationWizard sheet → Prismatic Spray row → Cast Spell → target popup → tick ONLY the 4 monsters → "Cast Prismatic Spray (4)".
3. Observe "Saving Throw Required (1 of 22)" and PC collateral damage/death-save modal.

## Likely Location
src/services/rules/spells/spellCastService/execution/triggerSpells.js:453 `handleGenericAutomation` — action built with `metaCtx: {}`; should accept and forward the `metaCtx` parameter (as sibling handlers like `handleEnhanceAbility` in the same file do). Fix: thread `metaCtx` through `executeSpellCast → handleGenericAutomation → action.metaCtx`.

## Notes
- Damage die is **10d6 not RAW 12d6** — declared by `public/data/2024/spells.json` automation.damage ("10d6"); spell prose says 12d6. Data gap, judge accordingly.
- Cast popup text says "roll 2d7" (implementation is 1d8, 8→2×1d7) — cosmetic.
- Cosmetic log noise: failed saves get suffix "— full success" (`savePrompt.js` dcSuccess-label bug), and Indigo/Violet save_result text reads "full undefined restrained/banished damage" (handler interpolates damageFormula for non-damage rays).
- Prompt cadence: NPC prompts need manual Roll Save → Done/Next Save here (no silent auto-roll); death saves surface as `.dsp-overlay`.
