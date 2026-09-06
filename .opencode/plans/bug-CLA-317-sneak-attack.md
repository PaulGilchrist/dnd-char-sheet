# BUG CLA-317 — Sneak Attack: no-trigger control fires full sneak (spatial ally gate dead-letter)

**Verdict: FAIL** (2026-09-05, live E2E on test-campaign, AasimarTest lv17 Thief Rogue 2024, PB+6, Shortsword 1d6+2 Piercing, EB Thug 1 AC 11, Test Map).

## Canonical vs row
- Canonical 2024 (`public/data/2024/classes.json` Rogue → Sneak Attack lv1): once per turn, 1d6 scaling `{17:9d6}` → **9d6 at lv17**, Finesse/Ranged, advantage OR ally-within-5ft-not-Incapacitated, no disadvantage, type = weapon's type. Row's "extra 1d6" is the lv1 base text — app data row matches canonical; sheet displays "+9d6" correctly.

## Live consumers
- Gate: `src/services/automation/contextBuilder-sync.js:660-703` — Rogue-only, `class_levels[].sneak_attack_num_d6`, finesse-prop-or-ranged, `forcedMode!=='disadvantage'` (:673), round-latch `_SneakAttack_usedRound` (:676-678), trigger = advantage OR ally `isWithinRange(target, ally, 5)` (:690).
- Apply: `src/services/combat/steps/attackRollDamageCalc.js:103-136` — rolls Nd6, appends ` + Nd6 [Sneak Attack]`, stamps latch.

## PRIMARY DEFECT — "ally within 5 feet" is unenforced
`isWithinRange` (`src/services/rules/combat/rangeCheck.js:14-33`) reads runtime `__map__.activeMapName` and `__campaign__.campaignName` — **grep-proven ZERO production writers** anywhere in src/ (only readers in rangeCheck.js + reactionDebuffHandler.js; App.jsx tracks map only in React state, never writes the runtime keys). Live probe (in-page, map opened, Thug 1 at 7,10, ElderPaladin at 4,5):
- `getRuntimeValue('__map__','activeMapName') → null`
- `isWithinRange('Thug 1','ElderPaladin',5) → TRUE` (25 ft apart!)

**G1 no-trigger control (round 2, map open, every ally ≥10 ft from target, mode:normal, no conditions on target):** Shortsword HIT(20 vs AC 11) → damage popup **"1d6+2 [piercing] + 9d6 [Sneak Attack]: … +2 27 damage — HP: 32 → 5"**. Sneak fired with NO trigger at all. Decisive: the attack should have been 1d6+2 only.

## Secondary gaps
1. **Ally Incapacitated check missing** — contextBuilder-sync.js:686-695 filters only `type==='player' || (type==='npc' && attitude!=='hostile')`; canonical "the ally doesn't have the Incapacitated condition" is never consulted.
2. **Round-latch ≠ once-per-turn** — latch is `=== currentRound` (once per ROUND). Once-per-round re-arm verified working, but RAW sneak can also fire on a reaction in another creature's turn; the round latch blocks that (app-model approximation, noted).
3. **COLLATERAL: monster-autocomplete Enter renames monster.** Pressing Enter with stray text in initiative `.monster-autocomplete-input` renamed "Thug 1" to `""`; combatSummary name became empty → `findCreatureByName` null → popups rendered roll-only with **no HIT line and no Done button**, damage silently abandoned on 3 attacks (rolls logged, no hp_change). Required Initiative→Clear + EB re-join to recover.
4. **COLLATERAL: duplicate damage + spurious Cunning-Strike poison chain.** Round-2 trigger attack applied damage TWICE: log shows `1d6+2 [piercing] + 9d6 [Sneak Attack]` + hp_change, then `2× 1d6+2 [piercing] + 9d6 [Sneak Attack]` with the SAME rolls + second hp_change (thug 32→5→0). A DC 16 CON "Saving Throw Required" (Cunning Strike Poison) prompt also fired after the Devious Strikes modal was CANCELLED. (SP-097 ghost-prompt / FT-074 family.)
5. **Unplaced NPC counts as adjacent ally** — leftover cs creature "NPC 1" (type npc, attitude undefined, no map token) satisfied `attitude!=='hostile'` and its lenient `isWithinRange` → trivially "adjacent ally"; had to be removed via `.npc-remove-btn` for clean rig.

## Gates that DID work (exact)
- Dice count 9d6 = lv17 2024 table, popup rolls 10 dice (9+2 mod vs +2 shown), type Piercing (shortsword) in log `damageType`.
- Once-per-round block: same-turn 2nd attack popup `1d6+2 [piercing]` only; next-round re-arm fired again (`+ 9d6 [Sneak Attack]`, HP 40→3).
- Disadvantage gate: Blinded attacker (Add modal + Apply) → popup "Disadv (conditions)" badge, mode:disadvantage, `1d6+2 [piercing]` no sneak.
- Non-finesse gate: Mace equipped via Edit wizard (real keystrokes) → `1d6+2 [bludgeoning]` no sneak.

## Suggested fix direction
Give `rangeCheck.js` a working map/campaign source (e.g., App writes `__map__.activeMapName` via setRuntimeValue when activeMapName set/cleared, same for `__campaign__`), or have the sneak ally loop consume the map context it already has (contextBuilder-map `mapData` positions) instead of the dead `isWithinRange`. Add ally-incapacitated filter in the :689 loop.

## Config after test
Shortsword RESTORED (`equipped:["Shortsword"]` verified on disk). Session logs/change-data Admin-cleared after; map tokens left: AasimarTest(6,10), Thug 1 placed npc(7,10), ElderPaladin(4,5), others as before; EB Thug 1 joinable.
