# Bug CLA-182 — Improved Brutal Strike: new options (Staggering/Sundering Blow) never offered at lv13

**Date:** 2026-08-29 · **Campaign:** test-campaign (2024 rules) · **Character:** DraconicDragon lv13 (Path of the Berserker)

## Expected
At lv13 the Brutal Strike picker in RecklessAttackModal lists 4 options (Forceful, Hamstring, **Staggering Blow**, **Sundering Blow**) per `public/data/2024/classes.json` lv13 feature "Improved Brutal Strike" (NOT lv11 in this dataset — confirmed via classes.json; lv9 BS, lv13 IBS, lv17 BS-upgrade).

## Actual (UI evidence, Playwright)
1. Lv confirmed: sheet shows "Improved Brutal Strike" feature text; `public/campaigns/test-campaign/DraconicDragon.json` has `"level": 13`.
2. Dragon turn, Rage active, clicked Longsword row → Reckless Attack modal ("Use Reckless Attack?" + "Use Brutal Strike — Forgo Advantage for extra 1d10 damage").
3. After checking Use Brutal Strike, `input[name="brutalOption"]` enumerated = exactly **2 radios**: "Forceful Blow— Push target 15 ft", "Hamstring Blow— Reduce target Speed by 15 ft". **No Staggering/Sundering Blow.** Repeated same result; new options unreachable → Staggering/Sundering targetEffects can never be created via UI, so downstream te/+5 checks are moot (code for them exists and is unit-tested).
4. Rider-name proof: after picking Forceful Blow + Attack Recklessly, log shows `DraconicDragon uses Brutal Strike on Longsword — Forceful Blow` — rider name is lv9 "Brutal Strike", not "Improved Brutal Strike".
5. Context: Ogre 1 AC11 HP68 joined; second-turn auto-roll HIT 22 vs AC 11, 9 dmg (68→59) — pipeline alive, just bound to lv9 rider.

## Root cause
Two `attack_rider` passives coexist at lv13 (lv9 BS 1d10, lv13 IBS 1d10). Both picker and hit-time resolver select via sort on damage-dice **count only**, which ties at 1d10; stable sort keeps the earlier-collected lv9 feature first:
- `src/components/char-sheet/useCharActionsAttackHandlers.js:38-47` — `brutalStrikePassives.sort(countB - countA)`; `brutalStrikePassive = brutalStrikePassives[0]` → lv9 rider, `brutalStrikeOptions` = 2 options.
- `src/services/combat/steps/attackRollBonuses.js:113-122` — identical dice-count sort picks lv9 rider at hit time (log name evidence above). Note: options stored at :137-152 DO support `disadvantage_on_next_save`/`next_attack_bonus` — they're just never selectable.

## Suggested fix
In both sort sites, tie-break by feature level (or include the merged options): e.g. sort by `countB - countA || (b.featureLevel||0) - (a.featureLevel||0)`, or better — merge options of all matching riders (dedupe by name, keep highest damageExpression). Passives need feature `level` carried through `automationCollector.js`/`routeAutomation` if not already.

## Secondary observations (not filed)
- Confirming the picker modal without a Target set on the initiative card wastes the once-per-turn mark (`_BrutalStrike_usedRound`): attack auto-rolls rest of turn with no picker and no targetEffects (playbook already warns attacks need Target dropdown).
- `next_attack_bonus` consumption only exists inside the dragon's own next brutal-strike attack (`contextBuilder-sync.js:422-427`); ally attacks read but never consume it — "one Sundering Blow" lifetime enforcement unverifiable until primary bug fixed.

## Recipes
- This dataset places Brutal Strike at lv9/Improved lv13 (not PHB 3/11) — always confirm via `public/data/2024/classes.json` class_levels index before leveling test chars.
- Weapon attacks that must apply targetEffects: set initiative-card Target combobox BEFORE clicking the attack row, else popup shows no "vs AC" line and targetEffects are skipped (`effectChoices.length && targetName` gate at attackRollBonuses.js:133).
- RecklessAttackModal option radios only render AFTER checking "Use Brutal Strike"; enumerate via `input[name="brutalOption"]`.

## Cleanup
Ogre removed from initiative (HP 59 left), DraconicDragon Long Rest, Admin → Clear Change Data + Clear Campaign Log (both dialogs confirmed; `data/character-change-data.json` + `data/campaign-log.json` verified absent). Registry updated: DraconicDragon level 5→13 kept.
