# Bug CLA-280 — Radiant Strikes: +1d8 Radiant added to RANGED weapon hits (melee gate missing)

## Title
CLA-280 Radiant Strikes — `melee_weapon_hit` damage_bonus consumer has no melee/ranged gate; ranged Longbow hits also gain +1d8 Radiant.

## Overview
Radiant Strikes (app data: **base Paladin lv11**, `public/data/2024/classes.json` ~line 7278, `automation: {type:'damage_bonus', trigger:'melee_weapon_hit', damageExpression:'1d8', damageType:'Radiant', casting_time:'passive'}`) is fully implemented and fires on melee weapon hits, but the consumer applies it to EVERY weapon-attack damage roll regardless of melee/ranged. The `automationBonuses` pipeline step runs for ranged weapon attacks too and its `melee_weapon_hit` branch checks neither `ctx.isMeleeOrUnarmed` nor the attack's properties.

## Expected Behavior (canonical wording, classes.json lv11)
"When you hit a target with an attack roll using a **Melee weapon or Unarmed Strike**, the target takes extra 1d8 Radiant damage."
→ Ranged weapon hits must NOT gain the 1d8 Radiant. Extra damage on every melee hit (no once-per-turn limit) is correct.

## Actual Behavior
- Melee Longsword hits: damage popup formula `1d8+5 [slashing] + 1d8 [radiant]` — CORRECT (3/3 attacks on Thug 1, every hit; log rolls totals 13/13/18, hp_change -13/-13/-18).
- **Ranged Longbow hit (150 ft. property, +9 vs Zombie 1 AC 8): damage popup `1d8+3 [piercing] + 1d8 [radiant]: 8, 1 +3 — 12 damage, HP 15 → 3` — WRONG.** Log roll entry formula `1d8+3 [piercing] + 1d8 [radiant]`, hp_change -12.

## Steps to Reproduce
1. test-campaign, ElderPaladin lv20 Oath of the Ancients (STR 20/+5, PB+6).
2. Encounter Builder → search `Thug` → tick "Select Thug" → Join Encounter (skull).
3. Initiative view → ElderPaladin card Target dropdown = Thug 1 → open sheet → Actions grid ".clickable" "+11" → HIT → Done → damage popup shows `+ 1d8 [radiant]` (expected). Repeat — adds on every hit (expected, oncePerTurn:false).
4. Edit wizard → Inventory step → Equipped Items textarea = `Longbow, Scale Mail, Shield` → **Next** → step 17 → "Save Changes" → wait 15s (JSON ground truth).
5. EB-join Zombie (AC 8) → ElderPaladin card Target = Zombie 1 → sheet Longbow "+9" → HIT → Done.
6. Damage popup: `1d8+3 [piercing] + 1d8 [radiant]` — radiant adder on a ranged attack.

## Likely Location (real paths)
- **`src/services/combat/steps/attackRollBonuses.js:22-25`** (`buildAutomationBonusesStep`, pipeline steps[10]): `for (const a of actions.filter(x => x.type === 'damage_bonus' && x.trigger === 'melee_weapon_hit')) { ... formula += ... }` — no check of `ctx.isMeleeOrUnarmed` (already computed upstream in the buildContext step, `attackRollDamageCalc.js:248`) and no check of `ctx.attack.properties` for Ranged/Ammunition. Contrast the sibling `melee_heavy_weapon_hit` branch at :36 which correctly gates on `(ctx.attack?.properties || []).includes('Heavy')`.
- Pipeline entry: `src/components/char-sheet/useAttackDamageResolution.js:78` → `src/services/combat/steps/index.js` (isAttackRoll covers ranged weapons too).
- Supply chain is fine: `automationInfoBuilder/damage.js:4` → `automationRouter.js:34` (→ `actions`) → live collector probe returns the Radiant Strikes action with `oncePerTurn:false`.

## Notes
- Fix direction: gate the :22 branch on `ctx.isMeleeOrUnarmed === true` (data is already in ctx when steps[10] runs).
- Cosmetic companion gap observed: log `hp_change.damageBreakdown` itemizes only the weapon type (Slashing 13 / Piercing 12) — the radiant dice ride inside the total but are never broken out (same under-reporting family as multi-part monster damage, CLA-180 note).
- Manifest paths stale again: real consumer is in `combat/steps/`, not `combat/automation/handlers/classFeatureHandler.js`.
- Session state left clean: Thug 1 + Zombie 1 removed (confirms carried HP probes "Zombie 1 has 3 HP"), Admin Clear Change Data + Clear Campaign Log accepted (both files absent on disk = ground truth), ElderPaladin inventory reverted to `Longsword, Scale Mail, Shield`.
