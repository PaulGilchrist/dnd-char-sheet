# Checkpoint — CLA-216 Lucky (Halfling racial trait)

## Setup (registry reuse)
- Character: **LightfootHalfling** — 2024, Halfling, Fighter (Champion) lv3, `public/campaigns/test-campaign/LightfootHalfling.json` (race object contains Halfling, rules "2024"). No creation needed.

## Data + real implementation chain (manifest paths stale)
- `public/data/2024/races.json` Halfling trait "Lucky": `automation {type:'auto_reroll', target:'d20', condition:'roll_equals_1', effect:'reroll', casting_time:'passive'}` — AUTOMATIC reroll model (NOT the FT-049 lucky_point adv/dis feat model).
- Chain: automationRouter.js:122 (`auto_reroll` passive → specialActions) → rules.js allFeatures → automationModifiers.js:35 (`auto_reroll` mod collected) → conditionEffectsInternal.js:231-239 (target 'd20' → `autoRerollForChecks=true`, `autoRerollCondition='roll_equals_1'`) → CharAbilities.jsx:196-199 (check ctx) / :227-228 (save ctx autoRerollForSaves NOT set by d20 target) → useLoggedDiceRollAttack.js:75 → **d20RollComputation.js:18-26** ("Halfling Lucky: automatic reroll on natural 1").
- UI evidence expected: DiceRollResult.jsx:135-137 "N (Lucky reroll)" + :370-372 banner "Lucky (Halfling): rerolled natural 1 → N"; log useLoggedDiceRollAttack.js:132-137 "used Lucky (Halfling trait): rerolled natural 1 …". Manual reroll button hidden for roll_equals_1 (DiceRollResult.jsx:376) by design (auto model).

## SUSPECTED BUG (static, pre-browser)
- d20RollComputation.js:21: `effectiveD20Roll === 1` — `effectiveD20Roll` is declared `let` at :15 with NO value until :124-129. So `isLuckyReroll` is ALWAYS false (undefined === 1). Halfling nat-1 never auto-rerolls; manual button also hidden → no reroll at all. Secondary flaw: even if fixed at :21, forcedMode blocks at :124-130 would clobber luckyRerollValue.

## Plan
1. UI: LightfootHalfling sheet → ability check cell (auto-rolls, CLA-196 recipe) repeatedly until nat 1; capture popup d20, Lucky banner presence, log entry.
2. If nat-1 shows no reroll/log → runtime probe computeD20Roll in-page to confirm luckyRerolled never true → FAIL + bug file.
3. Cleanup: Admin Clear Change Data + Clear Campaign Log.
