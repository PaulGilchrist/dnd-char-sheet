# Bug CLA-180 — Illusory Self use counter never resets on Short OR Long Rest

**Verdict: FAIL** (2026-08-29, test-campaign, 2024 ruleset, IllusionWizard lv14 Illusionist)

## Feature
2024 classes.json Wizard→Illusionist lv10, automation `{type:'illusory_self', trigger:'attack_hit', uses:1, recharge:'short_or_long_rest', spellSlotRestore:{minLevel:2}}`.
Handler: `src/services/automation/handlers/class-wizard/illusorySelfHandler.js` (USES_KEY `illusorySelfUses`, runtime counter = uses SPENT).

## What works (verified via Playwright)
- Wight 1 (+4) HIT 12 vs AC 9 → reaction click → popup "Result: The attack automatically misses." + "The illusion dissipates. Uses remaining: 0 / 1 (Short or Long Rest)."
- Damage rollback via `rollbackDamage` (healed 4 HP, 32→36), log: "IllusionWizard used Illusory Self — Wight 1's attack misses. The attack is retroactively negated and IllusionWizard is healed for 4 HP."
- Uses counter increments 0→1 (`illusorySelfUses` in change-data).
- Spell-slot restore path works: second hit with uses spent → "IllusionWizard expended a level 2 spell slot to restore a use of Illusory Self." logged, `spell_slots_level_2` 3→2, attack negated (healed 5 HP).
- Concentration untouched (conc state null throughout, no eviction).

## The bug
After the base use is spent (`illusorySelfUses=1`), a **Short Rest** (`short_rest` log entry, Complete Short Rest clicked) and a **Long Rest** (`long_rest` log entry; HP 30→44, lv2 slots 2→3 restored as proof rest executed) BOTH leave `illusorySelfUses=1` in change-data. The feature's once-per-rest use is never restored short of burning a lv2+ slot forever.

## Root cause (static)
`illusorySelfUses` is absent from BOTH reset arrays in `src/services/rules/effects/restRules-constants.js`:
- `SHORT_REST_RESOURCES` (lines 59–82)
- `LONG_REST_RESOURCES` (lines 88–206)
`applyShortRest`/`applyLongRest` null keys only from those arrays, so `getRuntimeValue(...,'illusorySelfUses') ?? 0` (handler line 44) keeps returning 1 → `currentUses >= maxUses` forever → every activation takes the slot-expense branch (handler lines 46–54). Compare working siblings: `beguilingDefensesUses`, `searingvengeanceUses` ARE in LONG_REST_RESOURCES (lines 195–197).

## Fix suggestion
Add `'illusorySelfUses'` to SHORT_REST_RESOURCES and LONG_REST_RESOURCES.

## Secondary observation (separate pipeline, not filed here)
Monster mc-overlay multi-dice attack applied 12 total (4 slashing + 8 necrotic secondary) but `campaign.lastAttack` recorded `primaryDamage:4, secondaryDamage:4, actualDamage:4` → rollback negated only 4 HP; 8 necrotic persists (RAW should negate all 12). Secondary-damage bookkeeping in attackPostProcessing under-records multi-part monster damage.

## Ground-truth probes
- change-data: `IllusionWizard.illusorySelfUses` stayed `1` across both rests; `currentHitPoints` 44, `spell_slots_level_2` 3 after Long Rest (rest demonstrably executed).
- Log endpoint: `/api/campaigns/test-campaign/log` — short_rest + long_rest entries present, zero "Illusory Self restored" behavior.
