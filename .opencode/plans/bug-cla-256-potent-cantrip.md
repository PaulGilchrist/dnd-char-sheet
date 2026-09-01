# BUG CLA-256 — Potent Cantrip: attack-roll cantrip MISS deals 0 (not half) damage

## Title
CLA-256 Potent Cantrip (Evoker lv3 passive) — save-success half-damage works exactly, but attack-roll cantrip misses apply 0 damage instead of half the cantrip's damage.

## Overview
Verified E2E on **DivinationWizard** converted to **Wizard lv20 Evoker** (2024 rules, INT 16/+3, spell attack +9, DC 17) vs EB-joined **Archmage 1** (AC 17, HP 170, INT +5 fallback save). Potent Cantrip (`public/data/2024/classes.json` Wizard majors[2]=Evoker features[1] lv3, `automation:{type:'potent_cantrip', casting_time:'passive'}`) collectors + consumers are all live (`automationModifiers.js:213` → `automationRouter.js:632` passives → `hasPotentCantrip` loggedDiceRollUtils.js:43). Leg B (save-cantrip save-success) verifies EXACTLY. Leg A (attack-roll cantrip miss) fires the feature UI + log but the half-damage amount is derived from a corrupt stored pre-roll and lands as 0.

## Expected Behavior
When a cantrip at a creature misses with the attack roll, the target takes HALF the cantrip's damage. At lv20 Evoker Fire Bolt = `4d10 + 3 [Empowered Evocation]` (+3 twice per this app's hit-path formula, totals 26–39 observed on hits), so a miss should deal approximately floor(total/2) ≈ 5–23 damage (exact half of the rolled damage, never 0 unless the raw roll is 0–1).

## Actual Behavior
- **Leg A FAIL**: Two independent Fire Bolt MISSes both applied **0 damage** (`HP unchanged`, no `hp_change` log):
  - Miss #1 (forced-low patch): popup "Fire Bolt — 0 damage applied to Archmage 1 — HP: 131 → 131 **Potent Cantrip: half damage on miss**"; log `{rollType:"cantrip-miss-half-damage", name:"Fire Bolt", formula:"4d10 + 3 [Empowered Evocation] + 3 [Empowered Evocation]", rolls:[1], total:0, isPotentCantrip:true}`.
  - Miss #2 (only first random call forced; damage dice natural path): attack d20 4 +9 = 13 MISS vs AC 17; same popup "0 damage applied HP: 105 → 105"; same log with `rolls:[1], total:0`.
  - The recorded half-damage roll contains only ONE die (`rolls:[1]`) while the displayed formula is `4d10 + 3 + 3`. The stored pre-roll (`autoDamageRollResult`, rolled in `noSavePath.js:21` from `overchannelFormula`) parses as a SINGLE die (patch-insensitive: fully-patched run also produced `rolls:[1]`, not `[1,1,1,1]`), with modifier 0 — so `attackPostProcessing.js:280-289` takes `floor(storedTotal/2)` of a ~1-die roll = 0 instead of re-rolling/halving the scaled cantrip formula.
  - Control hits in the same session dealt FULL damage with correctly scaled dice, proving the sheet/target/apply pipeline works: HIT d20 16+9=25 → `damage rolls:[7,8,8,10] total:39` HP 170→131; HIT d20 14+9=23 → `rolls:[7,3,1,9] total:26` HP 131→105. HP accounting confirms misses contributed NOTHING (170−39−26=105).
- **Leg B PASS (exact)**: Mind Sliver (2024 data: Wizard, INT save, `dc_success:'none'`, 4d6 @lv17+) vs Archmage:
  - Cast 1 SAVE FAILURE (15+0 vs DC 17): FULL damage 4d6 [5,4,6,5]=20, `hp_change delta:-20` → 85.
  - Cast 2 SAVE SUCCESS (d20 18+0 vs DC 17): popup "4d6: 5, 5, 4, 2 … ✓ SAVE SUCCESS (18 vs DC 17) … **8 damage applied HP: 85 → 77**"; log `save-damage rolls:[5,5,4,2] total:16 saveResult:"success" saveDc:17` + `hp_change delta:-8 currentHp:77`. `floor(16/2)=8` EXACT (`handleNpcSaveDamage.js:102` branch).
  - No additional effect on save success: target `activeConditions` empty, no campaign `targetEffects` keys in change-data (Mind Sliver d4 rider correctly absent on success).

## Steps (repro)
1. Convert a lv20 2024 Wizard to **Evoker** (Edit wizard step-7 selectOption('Evoker') + ✓Save + 15s; works with `class.major` null). Prepare Fire Bolt + Mind Sliver (Spells step `.list-item-checkbox-trigger`).
2. EB-join Archmage (AC 17); set caster initiative-card Target = Archmage 1.
3. Cast Fire Bolt until MISS (~35% at +9 vs AC 17) — popup shows "Potent Cantrip: half damage on miss" but **0 damage applied**, HP unchanged, no hp_change log; `cantrip-miss-half-damage` log entry carries `rolls:[1] total:0` vs formula `4d10 + 3 + 3`.
4. Cast Mind Sliver until save SUCCESS — half damage lands EXACT (this leg is fine).

## Likely Location
- `src/services/rules/spells/spellCastService/execution/noSavePath.js:17-21` — the stored `autoDamageRollResult = rollExpression(overchannelFormula)` where `overchannelFormula = metaCtx?.overchannelFormula || spell.damage?.formula || resolveSpellDamageAtLevel(spell, playerStats.level)` resolves to a SINGLE-die formula (e.g. `1d10`/`d10`, modifier dropped) for the attack-roll cantrip path, while the hit-damage pipeline elsewhere recomputes the scaled `4d10 + 3 + 3`. Fiber probe confirmed `playerStats.level=20` and `spellAbilities.spells['Fire Bolt'].damage_at_slot_level.17='4d10'`, so the data is right — the formula selection in this pre-roll is wrong.
- `src/hooks/combat/attackPostProcessing.js:280-287` — for `missType==='miss'` the handler trusts `storedDamageResult.total` unconditionally (no sanity check against the displayed `finalFormula` dice count, no re-roll fallback) → `floor(≤1/2)=0` silently applied.

## Notes
- Both legs of the feature are WIRED (popup "Potent Cantrip: half damage on miss", `cantrip-miss-half-damage` log, `isPotentCantrip:true`, `dcSuccess:'half'` popup payload) — the defect is purely the miss-damage AMOUNT (0 vs exact half).
- Save-cantrip leg verified for `dc_success:'none'` cantrips only (2024 data: save cantrips deal no damage on success natively, potent fills the gap exactly).
- Test hygiene: two misses occurred inside temporary `Math.random` force-low windows (CLA-216 determinism technique) to guarantee MISS; the rolled-die-count anomaly (`rolls:[1]`) is patch-insensitive (identical in full-patch and first-call-only-patch runs) and force-low can only change values, not the number of dice `rollDice(count,…)` returns. A natural-rolled miss would yield `floor(1d10/2)` ≤ 5 vs exact-expected ≥ 5–19 — still wrong in almost all cases.
- Secondary noise seen on HIT path (adjacent defect, same formula assembly area): Fire Bolt hit formula string duplicates the Empowered Evocation bonus (`4d10 + 3 [Empowered Evocation] [fire] + 3 [Empowered Evocation]`) with modifier logged +6; raw 4d10 on hit #1 was 33 → 39 applied (double +3). Not the tested feature but worth checking alongside.
- Session state at cleanup: Archmage 1 removed; change-data + campaign log cleared via Admin. **DivinationWizard LEFT as Evoker lv20 with Fire Bolt + Mind Sliver prepared** (post-fix retest-ready; this supersedes the registry "Keep lv20 Diviner" note).
