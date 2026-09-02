# Bug — CLA-177 Naturally Stealthy (2024 Halfling base trait)

## Overview
The trait's automation is collected end-to-end but has **no consumer** — the feature is inert everywhere. Verified live 2026-08-29 in "test-campaign" (LightfootHalfling lv1 Fighter 2024, full evidence + runtime probes in git history of `incomplete-cla-177-naturally-stealthy.md`, now superseded by this file).

## Expected Behavior (canonical)
"Obscured only by a creature at least one size larger than you, you can use an Action to try to hide." The trait should matter when hiding behind a larger creature.

## Actual Behavior
- Plumbing exists: `public/data/2024/races.json` [6] Halfling `traits[3]` (`automation:{type:'passive_rule', effect:'naturally_stealthy'}`) → `automationInfoBuilder/passive.js:233` → `automationRouter.js:375` passives → `automation/turnStartEffects.js:51` collects into `playerStats.turnStartEffects`.
- **No consumer:** `rules/effects/turnStartEffects.js` apply-loop (~20 branches) has NONE for `naturally_stealthy` — collected then dropped. `automationPassives.js:334 hasNaturallyStealthy()` exported via automationService.js:8, never called anywhere (grep-verified).
- **No Hide gating:** `useCharActionsBaseActions.js:20 handleHideAction` = Stealth vs flat DC 15 for ANY character — no canHide/cover/size/adjacency check, no trait citation.
- **No click path:** trait row → `executeHandler` (`automation/index.js:666`) has no `naturally_stealthy` branch → `if (!result) return` silent no-op (runtime-confirmed: zero popups).
- Control test: non-Halfling (AasimarTest) Hide → identical success flow ⇒ trait grants zero observable delta.

## Steps to Reproduce
1. http://localhost:5173 → "test-campaign" → LightfootHalfling (2024 Halfling lv1 Fighter; exists on disk).
2. Click sheet Actions "Naturally Stealthy:" row → nothing happens (no popup, no runtime keys, no log).
3. Base Action Hide (with or without a larger adjacent monster, e.g. EB-joined Ogre) → flat DC 15 Stealth for everyone, popup/log never cite the trait.
4. Control: any non-Halfling PC Hide → identical flow.

## Likely Location
- Missing consumer branch in `src/services/rules/effects/turnStartEffects.js` (or Hide gating path).
- `src/components/char-sheet/useCharActionsBaseActions.js:20` — needs cover/size gate citing `hasNaturallyStealthy()`.
- `src/services/automation/index.js:666` — no `naturally_stealthy` dispatch (inert row, CLA-179 family).

## Notes / fix options
(a) Gate `handleHideAction` on cover/obscuration with a `hasNaturallyStealthy(playerStats)` + adjacent-one-size-larger bypass (size from races/monsters data), citing the trait in popup + log; or (b) consciously declare Hide ungated app-wide and delete the dead plumbing (`turnStartEffects.js:51` collector + `hasNaturallyStealthy`) as informational-only. Either way the current state is a dead feature, not a pending validation.
