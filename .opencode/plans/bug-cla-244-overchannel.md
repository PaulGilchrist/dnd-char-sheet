# Bug CLA-244 — Overchannel: AoE damage spells not maximized (use counter still consumed)

## Title
CLA-244 Overchannel — "Overchannel (Maximize Damage)" checkbox consumes the use counter on AoE damaging Wizard spells but the damage roll is never maximized (and no IRV-ignoring backlash context is passed).

## Overview
Overchannel (2024 classes.json: **Evoker major lv14**, `automation.type:'overchannel'`, passive — NOT base Wizard lv6 as the manifest claims) surfaces a checkbox in SpellDetailPopup and works end-to-end for **single-target save spells**, but for **AoE damaging spells** (e.g. Burning Hands — the canonical lv1 example in the manifest) the entire overchannel context (`overchannelActive`, `overchannelFormula`, `overchannelUseCount`) is silently dropped by `handleAoE()`. The use counter is still incremented, so the caster burns uses for normal dice, and (per code) the self-damage backlash context would also never fire for AoE casts.

## Expected
When the "Overchannel (Maximize Damage)" checkbox is ticked for any damaging lv1-5 Wizard spell, ALL damage dice of that spell roll at maximum (e.g. Burning Hands 3d6 → 18 [+INT via Empowered Evocation]), logged with `[Overchannel Maximize]`; 2nd+ use before Long Rest deals `(2 + (useCount-1))d12 × slotLevel` Necrotic to caster ignoring resistance/immunity.

## Actual (verified live 2026-08-31, test-campaign, DivinationWizard lv20 converted Evoker, INT +3, DC 17)
- **AoE FAIL**: Burning Hands lv1 cast with checkbox ON vs Zombie 1 + Zombie 2 → popup/log `save-damage formula:"3d6" rolls [3,3,5]=11` and `[2,2,6]=10` — normal rolled dice, NO `[Overchannel Maximize]` suffix — while `Overchannel_useCount` went 0→1 (use consumed, first-use-no-damage correct).
- **Single-target PASS (same build)**: Mind Spike lv2, 2nd use → `save-damage formula:"3d8 [Overchannel Maximize]" rolls [8,8,8]=24`; backlash log `overchannel-damage formula:"6d12" rolls [4,6,2,10,10,3]=35 Necrotic target=DivinationWizard note:"Overchannel self-damage (ignores resistance/immunity)"`; caster HP 82→47 exact; concentration CON save prompt appeared. UI warning pre-cast: "use #2 ... 6d12 ... (ignores resistance/immunity)".
- lv6+ exclusion PASS: Chain Lightning popup has no Overchannel checkbox. Long rest resets `Overchannel_useCount`→0, next cast is use #1 (no self damage, still maximized on single-target).
- Secondary gap visible: AoE path formula also omits Empowered Evocation `+3` (handleAoE builds damage straight from `damage_at_slot_level`).
- Note (accepted per app rule): app backlash formula is `(2+(useCount-1))d12`/slot level → use 2 = 3d12/level, RAW says 2d12; UI + handler + steps all consistent with the app formula (overchannelHandler.js popup text `${useCount*2}d12` flat is a third, different formula, only shown via feature-row info popup).

## Steps to Reproduce
1. test-campaign; character: Wizard lv20 Evoker (subclass must be re-selected via Edit-wizard step 6 Class re-pick if stale `class.major` present — see Notes).
2. Prepare Burning Hands (lv1). Encounter Builder → 2× Zombie → Join Encounter.
3. Caster sheet → Burning Hands row → Cast Spell popup → tick "Overchannel (Maximize Damage)" ("First use: no necrotic damage") → Cast → Soulstitch modal → Apply (0 spared target — pick any PC) → area modal tick both Zombies → "Burning Hands (2)".
4. Observe result popup + log: damage dice are NORMAL (3d6 random), no `[Overchannel Maximize]`, yet change-data `Overchannel_useCount` = 1.
5. Cast lv1-5 damaging AoE again → expect further consumed uses with normal damage (backlash also absent — never wired to `saveAttackAoe` payload).

## Likely Location
- `src/services/rules/spells/spellCastService/execution/savePath.js` `handleAoE()` (~L32-122): receives `overchannelFormula/overchannelActive/overchannelUseCount` params but builds the `saveAttackAoe` automationPopup payload WITHOUT any overchannel fields → modal consumer rolls normal dice.
- `execution/damageCalculation.js` `computeOverchannel()` (:91-119) increments `Overchannel_useCount` regardless of path, so AoE casts consume the counter.
- Downstream consumers `src/hooks/combat/handlers/handleAoeDamage.js` (:188 already calls `handleOverchannelSelfDamage`) would need `context.overchannelActive/overchannelUseCount/overchannelSpellLevel` in the payload and a `rollExpressionMaximized` branch mirroring `handleSingleTargetSave` (:147-156).

## Notes
- Manifest paths stale: no `classFeatureHandler.js`/`classFeatureRouter.js`/`classFeatureInfoBuilder.js` overchannel chain; real chain = `automationRouter.js:644` (passive) → SpellDetailPopup checkbox → `computeOverchannel` → savePath/noSavePath/AoE + `overchannelHandler.js` helpers + `restRules-longRest.js:535` reset.
- **Stale `class.major` gotcha** (this run): subclass combobox (WizardStepSubclass onChange) only writes `class.subclass.name`; `classRules2024.getClass` prefers `playerSummary.class.major` over `subclass.name`, so a conversion that leaves the old `major` block in the JSON has ZERO effect on automation. UI fix: step 6 Class → re-pick any class → re-pick Wizard (handleClassChange rebuilds class object dropping `major`) → step 7 re-select subclass → Save. Verified JSON: `major` gone, `subclass:"Evoker"`, features recollect (Overchannel/Empowered Evocation/Soulstitch rows appear).
- Also unmaximized latent path: `noSavePath.js:21` uses `rollExpression` (spell-attack spells like Chromatic Orb) — overchannel flag never consulted there either.
- Environment: run cleaned (zombies removed, change data + campaign log cleared, caster long rested; subclass LEFT Evoker + Burning Hands/Chain Lightning/Mind Spike PREPARED for retest).
