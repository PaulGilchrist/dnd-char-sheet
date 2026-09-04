# bug-CLA-307 — Self-Restoration: no end-of-turn removal (fires at NEXT turn start) + zero logging

**Verdict: FAIL** (wrong timing + missing mandatory log). Feature is NOT inert — owner-gated auto-removal of the correct condition list DOES occur, but one full intervening span late and silently.

## Feature identity (app data canonical)
- `public/data/2024/classes.json` → Monk `class_levels[9]` = **level 10**, feature **"Self-Restoration"**.
- Description (quoted): *"Remove Charmed, Frightened, or Poisoned condition from yourself at end of each turn. Forgoing food and drink doesn't give Exhaustion."*
- Automation meta: `{type:"passive_rule", effect:"end_of_turn_condition_removal", conditions:["charmed","frightened","poisoned"]}`.
- Registry (manifest `CLA-307`) expectedBehavior matches app text; verified-status "not verified" pending this fix.

## Source chain
- Collector: `src/services/combat/automation/turnStartEffects.js:15-24` maps the meta to `{type:'condition_removal', conditions:[...]}`.
- Sole consumer: `src/services/rules/effects/turnStartEffects.js:73-87` (`applyTurnStartEffects`) — filters the **active creature's own** `activeConditions`.
- **THE BUG:** the app has **no turn-END consumer** (documented app-wide in the Inner Radiance comment at `turnStartEffects.js:104-106`, BUG CLA-198). `applyTurnStartEffects` is only invoked at the NEXT creature's turn start (`navigationHandlers.js:77,130`, `sseHandlers.js:121`). So removal executes at the **start of the monk's NEXT turn**, not the end of the current one. RAW requires the condition to be gone while every other creature takes their intervening turn; in the app it persists through ALL 13 intervening turns.
- **SECOND BUG:** the `condition_removal` branch writes `activeConditions` with **no `addEntry`** — zero condition-removed log entries (violates AGENTS.md "Every automation must log").

## Live evidence (Playwright, localhost:5173 → test-campaign; Disciplined_Monk lv17 War Open Hand 2024, immunities [])
Initiative order (15): Thug 1(idx0, init 19) → AasimarTest → AberrantSorcerer → **Disciplined_Monk(idx3)** → DivinationWizard → … → Wild_Sage_Druid.

**Poisoned (R1):**
- Turn 4, `activeCreatureName:'Disciplined_Monk'`, Add→Poisoned→Apply → store `activeConditions:['poisoned']` + DOM badge "Poisoned DC 10" + log `condition applied Disciplined_Monk Poisoned` ts=**1788551873057** (mid-turn presence = step 5 "before Next").
- **Monk turn END** (Next → `activeName:'DivinationWizard'`, round 1): store still **`['poisoned']`** → NO removal at end of turn.
- 14 clicks later, **monk turn START round 2** (`activeName:'Disciplined_Monk'`, round 2): store **`[]`** → removal fires at own next-turn START, ~13 creature-turns late.

**Charmed (R2):** applied ts=**1788551979727**; at monk turn end (active=DivinationWizard, round 2) still `['charmed']`; at monk **R3 turn start** `[]`. Same turn-boundary timing. Monk has NO immunities — no paladin-style Frightened-immunity confounder (pitfall 16 N/A).

**Negative control (Thug 1):** Poisoned applied ts=**1788552103328**; at Thug 1 turn START round 6 `['poisoned']` and at Thug turn END (`activeName:'AasimarTest'`, round 6) still `['poisoned']`; also still `['poisoned']` across monk's R4 turn start → removal is correctly owner-gated (own bucket only) and Thug never auto-clears. ✅ gating correct.

**Log (final, pre-cleanup):** 5 entries total — joined, roll, 3× `condition applied`. **ZERO condition-removed entries** despite two auto-removals. ❌

**Exhaustion half: IMPLEMENTED** — `automationImmunities.js:144 hasSelfRestoration()` consumed by `useTravelManagement.js:222-228`: forgoing food/drink exhaustion add is skipped for the monk. Real consumer, PASS.

## Fix suggestion
1. In `navigationHandlers.handleNextCreature` (and sseHandlers echo), before applying the NEW active creature's turn-start effects, run an owner turn-END pass for `activeCreatureName`: reuse the existing `condition_removal` filter for `turnStartEffects`-collected type `condition_removal` (rename or dual-gate) so it runs when the OWNER's turn ends.
2. Same location or inside the branch: `addEntry(campaignName,{type:'condition',action:'removed',characterName:activeName,condition,reason:'Self-Restoration'})` per removed condition.
3. `handlePreviousCreature` needs a guard so rewinding doesn't double-remove/log.

## Cleanup
Admin → Clear Change Data (`change-data keys []`) + Clear Campaign Log (0 entries). **Config LEFT: Disciplined_Monk lv17 Warrior of the Open Hand 2024 (untouched); Thug 1 joined state cleared with change data.**

## NEW pitfalls
- **Active-card text matching gives false positives/negatives:** player cards' Target dropdowns list every OTHER creature's name (incl. "Disciplined_Monk") → `.creature-card.active` textContent matches the wrong creature; EB **NPC** card textContent contains NO name at all ("HP/Initiative Target…" only). Reliable: poll top-level change-data `activeCreatureName` after each Next click.
- **`condition_removal` (Self-Restoration family) is silent:** no `addEntry` anywhere in that branch — log-based verification of turn-boundary removals will find nothing; must diff `activeConditions` per Next-click.
- **Manifest CLA-307 `handler`/`router` paths (classFeatureHandler/Router) are fiction** — the live chain is collector `combat/automation/turnStartEffects.js` → consumer `rules/effects/turnStartEffects.js` `condition_removal` branch at OWNER TURN START.
