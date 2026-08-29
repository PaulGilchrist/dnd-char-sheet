# INCOMPLETE — CLA-177 Naturally Stealthy (Halfling, 2024)

Verified via Playwright MCP on http://localhost:5173, campaign "test-campaign", 2026-08-29.

## Verdict
INCOMPLETE — collection plumbing exists end-to-end into `playerStats`, but there is NO consumer and NO observable automation delta attributable to the trait. Hide in this app has no cover/obscuration gating at all, so the trait's benefit ("hide when obscured only by a creature one size larger") is trivially true for every character; nothing cites, gates, badges, or logs Naturally Stealthy.

## What exists in code
- `public/data/2024/races.json` [6] Halfling `traits[3]` "Naturally Stealthy" with `automation: {type:'passive_rule', effect:'naturally_stealthy', casting_time:'1 action'}`. In 2024 this is a BASE Halfling trait — wizard confirms "Halfling has no subraces" (no separate Lightfoot).
- `src/services/combat/automation/automationInfoBuilder/passive.js:233` builds `{type:'passive_rule', effect:'naturally_stealthy', hasAutomation:true}`.
- `src/services/combat/automation/automationRouter.js:375` routes it to `result.passives`.
- `src/services/combat/automation/turnStartEffects.js:51` collects `{type:'naturally_stealthy'}` into `playerStats.turnStartEffects` (`rules.js:186`).
- `src/services/character/featureCategories.js:200` lists "Naturally Stealthy" under `actions` → row appears in sheet Actions.
- `src/services/combat/automation/automationPassives.js:334` `hasNaturallyStealthy()` — exported via automationService.js:8 but **never called anywhere** (grep-verified; only self + re-export + tests).

## What is missing (needs design)
- **No consumer**: `src/services/rules/effects/turnStartEffects.js:66-147` apply-loop has branches for ~20 turn-start types but NONE for `naturally_stealthy` — collected then silently dropped.
- **No Hide gating**: `src/components/char-sheet/useCharActionsBaseActions.js:20` `handleHideAction` = Stealth vs flat DC 15 for ANY character, no canHide/cover check to flip, no size comparison, no adjacency check.
- **No click path**: trait row click → `handleAutomationAction` → `executeHandler` (src/services/automation/index.js:666) has no `naturally_stealthy` handler → `if (!result) return` → silent no-op (no popup at all, runtime-confirmed).
- **No trait citation**: Hide success popup/log never mention the trait.

## Runtime evidence
1. Created LightfootHalfling lv1 Halfling Fighter 2024 via wizard (Steps: 2024 → name/level fill → Race=Halfling → "no subraces" → Acolyte → Fighter → Save). JSON verified `public/campaigns/test-campaign/LightfootHalfling.json`: race Halfling, rules 2024, level 1.
2. Sheet Actions shows "Naturally Stealthy:" row; clicking it → ZERO popups/changes (0 `[class*=popup]` matches) — trait is inert UI.
3. Encounter Builder → ticked exact Ogre (CR 2, Large) → Join Encounter → "Ogre 1" card in initiative.
4. LightfootHalfling → Base Action Hide → popup "Hide successful! (d20: 16 + -1 = 15)" vs DC 15 → Invisible badge on sheet; log `Stealth check: 15 (d20: 16 + -1) vs DC 15 — Success...` — no trait citation.
5. CONTROL: AasimarTest (Aasimar, non-halfling, no cover needed) → Hide → "Hide successful! (d20: 18 + 2 = 20)" → also Invisible. Identical flow ⇒ proves no gating exists; trait grants zero observable delta.
6. Cleanup done: Ogre removed (confirm "Ogre 1 has 68 HP. Remove anyway?" accepted), Long Rest (Invisible cleared), Admin → Clear Change Data + Clear Campaign Log (both confirms accepted).

## Needed design (if this should be automated)
Either (a) gate `handleHideAction` on cover/obscuration with a `hasNaturallyStealthy(playerStats)` + adjacent-creature-one-size-larger bypass (size from race/monster data), citing the trait in the popup/log; or (b) keep Hide ungated (current app-wide convention) and consciously mark CLA-177 as "passive, informational" — then the plumbing in turnStartEffects.js:51 is dead weight and should be removed.

## Recipes learned (add to playbook)
- 2024 Halfling: no subrace step content ("Your selected race (Halfling) has no subraces"); Naturally Stealthy is base-race trait landing in sheet **Actions** section.
- Wizard bulk click-through: loop Next + auto-`selectOption(index:1)` when Next disabled (Background/Class/Subclass are required selects); Save enables after Subclass.
- Initiative monster Remove button is `.npc-remove-btn` (icon-only `<i class="fa-solid fa-xmark">`, title "Remove NPC") — `button:has-text("Remove NPC")` does NOT match.
- Hide success popup stays open and intercepts the NEXT sheet click (`.popup-overlay` intercepts pointer events) — dismiss via backdrop corner click before another base action.
- Playwright MCP ran remote this session: saved `.playwright-mcp/*.yml` snapshot/console files not readable from workspace — all verification must be inline (`run_code_unsafe` return values / `browser_find`).
