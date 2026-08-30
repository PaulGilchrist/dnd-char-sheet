# Bug — CLA-208 Land's Aid (Circle of the Land, Druid)

## Overview
Land's Aid (`save_attack`, 2024 classes.json Circle of the Land **lv3**) activates end-to-end with the correct CON save DC (17) and spends a Wild Shape use, but at Druid lv20 it rolls the **base 2d6 for BOTH damage and healing** instead of the rules-mandated **4d6/4d6** (lv14 scaling), and the "one creature regains HP" half **never actually restores HP** to a damaged NPC (heal applied = 0).

## Expected (2024 classes.json + feature description)
- Action; expend 1 Wild Shape use; point within 60 ft; CON save DC = 8 + WIS mod + PB.
- Sphere 10 ft: 4d6 Necrotic on fail (lv20; `scaling: {"10":"3d6","14":"4d6"}`), half on success.
- One creature regains 4d6 HP (`healScaling: {"10":"3d6","14":"4d6"}`).
- Wild Shape uses decremented.

## Actual (E2E, 2026-08-29, Wild_Sage_Druid lv20 WIS 16/+3, PB +6, vs EB-joined Animated Rug of Smothering 1)
- Modal opens correctly: "CON saving throw (DC 17)" ✓, but text says "takes **2d6** Necrotic damage" and "heal for **2d6** HP" — level scaling never applied (should be 4d6/4d6 at lv20).
- NPC save auto-rolled raw d20 4 vs DC 17 → Failed; damage rolled **2d6 = 7** (not 4d6); combatSummary `currentHp 27→20` ✓ (card probe "Rug has 20 HP"); logs `save-damage formula:"2d6" total:7 finalDamage:7` + `hp_change delta:-7` ✓.
- Heal: chose the damaged rug; heal rolled **2d6 = 10**; result "**healed for 10 HP (actual: 0). Current HP: 27 / 27**"; log `hp_change delta:0`. Despite the rug being at 20/27 in combatSummary, the heal restored nothing (wrong HP source read).
- Wild Shape cost consumed: change-data `Wild_Sage_Druid.wildShapeUses 4→3` ✓.
- Cosmetic: sheet badge renders raw `DC ability CON` (unresolved 'ability' string); modal says "within 10 feet" (60 ft range from `auto.range` ignored in the heal branch).

## Steps to Reproduce
1. test-campaign, Wild_Sage_Druid lv20, subclass Circle of the Land (Edit step-7).
2. Encounter Builder → select "Animated Rug of Smothering" → Join Encounter.
3. Druid sheet → Actions → click "Land's Aid:" → modal shows 2d6/2d6 (expect 4d6/4d6).
4. Tick only the rug → "Land's Aid (1 target)" → rug auto-fails CON DC 17, takes 2d6 necrotic.
5. Radio-select the rug → "Heal Selected (2d6)" → popup "healed for N HP (actual: 0), Current HP 27/27" → Done.

## Likely Location
1. **Scaling dead**: `src/services/combat/automation/automationExpressions.js:14-22` `resolveScaling` only accepts **Array** `{level, damage}` entries; Land's Aid data stores OBJECT maps (`scaling {"10":"3d6"...}`, `healScaling` same) → returns null.
   - `automationInfoBuilder/save.js:7-8` damage stays `auto.damage` "2d6"; `:19-24` healScaling path expects array entries with `.healExpression` → heal stays "2d6". (`resolveHealingPoolExpression` at automationExpressions.js:30+ handles the object-map format but is not used for save_attack.)
   - `saveAttackHandler.js:210-250` heal+area branch passes `auto.damage`/`auto.healExpression` raw into the modal payload; no `resolveScaling` in this branch at all (the AoE branch at :339 calls it but also fails on the object format).
2. **Heal never lands on NPCs**: `SaveAttackHealModal.jsx:206-210` — `applyHealingDirectly({hitPoints: targetMaxHp})` reads runtime per-name `currentHitPoints`; NPC damage is stored in **combatSummary `creature.currentHp`** only (`applyDamage.js:283-290` writes creature object, not the runtime per-name key) → heal reads null→maxHp → actualHeal 0. NPC heal should read combatSummary `currentHp` (or applyDamage should persist NPC HP to the runtime store too).
3. Cosmetic: `automationInfoBuilder/save.js` returns numeric `saveDc` but the sheet badge (`CharActions.jsx:597`) reads the row's RAW automation (`auto.saveDc:'ability'` → "DC ability CON"); heal branch range `saveAttackHandler.js:226` uses `getEmanationRange` (falls back to 10 ft) ignoring `auto.range '60_ft'`.

## Notes
- Registry subclass had to be converted Moon→Land (JSON ground truth Circle of the Land lv20 kept for retries).
- NPC auto-save in this modal rolls RAW d20 vs DC (saveBonus computed at SaveAttackHealModal.jsx:25 but never added to total at :28-30) — affects all saveAttackHeal features, not just this one.
- DC math otherwise exact: 8 + WIS 3 + PB 6 = 17 (modal text + lastAttack.saveDc + logs).
