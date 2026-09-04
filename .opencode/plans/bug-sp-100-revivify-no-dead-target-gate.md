# BUG SP-100 — Revivify (2024 lv3): NO dead-target gate — living creatures can be "revivified" to 1 HP at full cost

## Severity
High (rules-breaking: destructive + resource sink; canonical text "You touch a creature that has died within the last minute" is unenforced).

## Reproduction (live, test-campaign, localhost:5173)
1. Divine_Cleric (lv17 Cleric) with `Diamond (300 gp)` ×2 in backpack, lv3 slots available.
2. Spells table → Revivify → "Cast Spell" → SecondaryTargetModal → select a FULLY ALIVE creature (LightfootHalfling, lv1, CON 14, max ≈6–7) → "Cast Revivify".
3. Result: accepted. Popup "Revivify — 1 HP (revived): 1 healing applied to LightfootHalfling". Runtime `LightfootHalfling.currentHitPoints = 1` (loses ~5 HP). lv3 slot 2→1. Diamond consumed (backpack 1→0, PATCH persisted). Logs: `spell` (Revivify, lv3), `material_consumed Diamond (300 gp)`, `hp_change delta:+1 currentHp:1 isHealing:true` — an HP-loss recorded as healing.

## Root cause (source)
- `src/hooks/combat/spellGates.js:559 gateRevivify` → `getCsAndTargets(campaign, {excludeCaster})` returns ALL combat creatures; no `currentHp<=0`/`isDead` filter.
- `src/components/char-sheet/char-spells/TargetSpellPopups.jsx:409-419` (and CharActionPopups:307) render every pending name; "The target must have 0 Hit Points" is descriptive text only.
- `src/services/rules/features/revivifyService.js:19-31` — no validation; unconditionally writes `currentHitPoints=1`, `isDead=0`, clears death saves.

## Working aspects (verified exact — do not regress)
- Dead-target revive: HP set to exactly 1; `isDead` reset; death saves cleared; lv3 slot consumed (3→2); `Diamond (300 gp)` consumed from backpack with disk PATCH + `material_consumed` log; `hp_change` + heal popup "1 HP (revived)"; no concentration.
- Material gate (upstream `useSpellMetamagicGates.js:16`): without diamond, cast refused before picker, slot untouched, no log. Refusal message has cosmetic duplicated suffix ", which the spell consumes, which the spell consumes."

## Suggested fix
1. In `gateRevivify` filter targets to dead creatures: PCs `getRuntimeValue(name,'isDead') || currentHp<=0` (combatSummary player stub is 1/1 — must consult runtime store), monsters `creature.currentHp<=0` (or explicitly exclude monsters — decide + document support).
2. In `revivifyService.triggerRevivify`, re-validate target dead BEFORE `consumeMaterial`; return refusal popup otherwise.
3. Ordering debt: `useConfirmableFlow.createConfirmHandler` spends the slot and writes the `spell` log before `applyFn`; a post-target refusal there would need slot rollback (use `rollbackSpellSlot`) — validate dead at picker time to avoid this.
4. Minor: `spell` log `targetName` should be the chosen target, not `targets[0]`; `hp_change.maxHp` reads combatSummary player stub (shows 1) — resolve real max.

## Evidence pointers
- change-data: `HexWarlock {currentHitPoints:1,isDead:0,deathSaves:[F,F,F],deathFailures:[F,F,F]}` after core cast; `LightfootHalfling {currentHitPoints:1}` after living probe.
- Log (30 entries pre-clean): death_save chain 18 S / 4 F / 5 F / 9 F + `result:"dead"`, then two Revivify `spell`+`material_consumed`+`hp_change` triplets.
- Network: PUT `/api/campaigns/test-campaign/Divine_Cleric.json` bodies show backpack transitions 2→1→0 diamonds.
- Full session: `.opencode/plans/checkpoint-SP-100.md`
