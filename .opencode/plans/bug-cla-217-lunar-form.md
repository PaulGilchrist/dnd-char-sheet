# BUG — CLA-217 Lunar Form (Druid, Circle of the Moon lv14, 2024)

## Verdict
FAIL — the `damage_bonus 2d10 Radiant` fires on the FIRST hit of a page session but NEVER re-arms on later turns/rounds. Once-per-turn gate compares against a permanently-stale round constant.

## Data ground truth (public/data/2024/classes.json)
- Druid → Circle of the Moon (majors[1]) features[4] "Lunar Form" **lv14**:
  - automation[0]: `damage_bonus 2d10 Radiant`, trigger `weapon_or_beast_form_attack_hit`, `oncePerTurn:true`, `upgrades:"Improved Circle Forms"`
  - automation[1]: `moonlight_step_rider` (Shared Moonlight)

## Steps (Playwright, localhost:5173, test-campaign, 2026-08-30)
1. Wild_Sage_Druid lv20 2024: Edit wizard step-7 Land → **Circle of the Moon** + ✓Save; JSON ground truth confirmed after 15s. Sheet shows "Lunar Form:" passive row (both halves) + "Moonlight Step:" row.
2. EB → tick "Animated Rug of Smothering" (AC 12 HP 27) → Join Encounter (21 cards, round 1). Druid initiative Target select = Rug.
3. Druid turn R1: Wild Shape → Brown Bear → Wild Shape confirm (uses 4→3, shape_shift buff + wild_shape te live in change-data).
4. Attack 1 (Unarmed Strike +5): **HIT 21 vs AC 12** → Done → damage popup `1d4-1 [bludgeoning] + 2d10 [radiant]: 1, 10, 8 -1` = **18 dmg, Rug 27→9**. Log: damage roll `formula:"1d4-1 [bludgeoning] + 2d10 [radiant]"` + hp_change delta −18. **First-hit half WORKS.**
5. Attacks 2-3 R1 (misses d20 2, d20 6): no bonus — correct. Attack 4 R1 **HIT 14 vs AC 12**: formula `1d4-1 [bludgeoning]` only — once-per-turn suppression works.
6. Walk turns (change-data `activeCreatureName`; `.active` cosmetic reset per CLA-174) to **round 2, druid turn** (`combatSummary.round:2`, `Wild_Sage_Druid._Lunar_Form_usedRound:1`, shape_shift STILL active, te wild_shape live).
7. Attack **HIT 15 vs AC 12**: `1d4-1 [bludgeoning]: 3 -1` = 2 dmg (9→7). **NO 2d10.** Second R2 attack **HIT 22 vs AC 12**: 1 dmg (7→6). **NO 2d10.** Bonus NEVER re-armed.

## Likely location (root cause)
- `src/services/combat/steps/attackRollBonuses.js:196` — `const round = getCurrentCombatRound();` called WITHOUT campaignName; line 219 writes the same value.
- `src/services/encounters/combatData.js:46-49` `getCombatSummary(undefined)` → `null`; `:78-81` `getCurrentCombatRound()` → `cs ? cs.round : 1` → **returns 1 forever**.
- Runtime probe (in-page dynamic import): `getCurrentCombatRound()` = **1** while `getCombatSummary('test-campaign').round` = **2**. So `_Lunar_Form_usedRound` is written 1 and the same-round check `usedRound === round` is true on EVERY later turn → bonus suppressed for the rest of the session. Effect: Lunar Form = once per PAGE LOAD, not once per turn.
- Same no-arg pattern family: attackRollDamageCalc.js:123 (`_SneakAttack_usedRound`), attackRollPostDamage.js:52/99, useModalHandlers.js writes — shared defect family (cf. CLA-188 damage-loss notes).
- Fix: `getCurrentCombatRound(ctx.campaignName)` at attackRollBonuses.js:196/219 (and audit the no-arg call list).

## Secondary observations (not the FAIL, but spec gaps)
- Consumer has **no shape_shift gate**: trigger matches any PC-sheet weapon/unarmed hit (matches playbook CLA-190 "Moon Druid unarmed hits emit Lunar Radiance noise = expected"); "no bonus on non-Wild-Shape" is NOT enforceable by this consumer design.
- Wild Shape beast attacks roll via the druid's own sheet dice links (PC pipeline is the ONLY consumer; mc-overlay monster route never consumed the bonus per bug-cla-184).
- **Shared Moonlight half NOT executed**: clicking "Moonlight Step:" → "No Moonlight Step uses remaining. Consume a level 2 spell slot…?" (pool 0 despite WIS +3 — CLA-163 zero-init family). Declined slot; then cleanup cleared combat. Consumer exists at `tempTeleportHandler.js:163-181`: on teleport it writes te `next_attack_advantage` for the initiative-target + description "Shared Moonlight: X also gains Advantage" — gridless approximation (no true 2nd-creature teleport UI), untested this run.

## Cleanup (verified)
Rug removed from initiative (confirm probe: "has 6 HP" = 27−18−0−1−2 exact). Admin → Clear Change Data + Clear Campaign Log; `character-change-data.json` + `campaign-log.json` ABSENT from `public/campaigns/test-campaign/data/`. Wild_Sage_Druid intentionally kept **Circle of the Moon lv20 2024**.

## NEW pitfalls
1. **Once-per-turn round gates written via no-arg `getCurrentCombatRound()` are stuck at 1 forever** (combatData.js returns null for undefined campaignName): any `_X_usedRound` written by `attackRollBonuses.js` blocks re-arm on all later rounds — to test "re-arms next round" you must first verify `getCurrentCombatRound(campaignName)` vs no-arg disagree.
2. Moonlight Step pool reads 0 immediately after a subclass swap (CLA-163 zero-init family); popup offers level-2-slot consumption instead.
3. Wild Shape: "Wild Shape:" row click opens `.sp-overlay` picker; click `.wild-shape-beast-name` row then modal button "Wild Shape" (second button) to commit; Brown Bear then sheet still shows Unarmed Strike +5 (beast attack = PC sheet dice link, NOT initiative-card route, for damage_bonus consumers).
4. Turn-walk verification: poll change-data `activeCreatureName` inside run_code_unsafe loop (fetch each iteration) — reliable through view navigation.
