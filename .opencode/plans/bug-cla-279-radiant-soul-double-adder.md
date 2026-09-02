# BUG CLA-279 — Radiant Soul (Celestial Patron): CHA adder applied TWICE per spell damage roll; save-AoE fire spells skip both adder and once-per-turn consumption

**VERDICT: FAIL** 2026-09-02 (E2E, test-campaign, 2024 ruleset, HexWarlock lv14 Celestial Patron, CHA 16/+3, PB+5)

## Data / supply (verified OK — manifest metadata stale, feature NOT inert)
- `public/data/2024/classes.json` Warlock `majors[1]` **Celestial Patron** feature lv6 `Radiant Soul`, `automation: [{type:'resistance', damageTypes:['Radiant'], casting_time:'passive'}, {type:'radiant_soul', damageTypes:['Radiant','Fire'], damageExpression:'CHA modifier', oncePerTurn:true, casting_time:'passive'}]`. Manifest CLA-279 "Automation type: undefined" is stale metadata only. Dispatch cases exist: `automationRouter.js:556` (radiant_soul→passives), `:151` (resistance→passives); info-builders `core-handlers.js:196` (resistance) + `:446` (radiant_soul).
- Live fiber probe on HexWarlock sheet: `automation.passives` contains BOTH entries with `hasAutomation:true`; `playerStats.resistances=["Radiant"]` (rulesFactory.js:102 merge); sheet "Resistances: Radiant". Supply-side alive (pitfall #10 probe clean).
- NOTE: NOT the Hex Blade as the dispatch guessed — in this dataset Radiant Soul is the Celestial Patron lv6 feature (matches 2024 PHB). HexWarlock converted Great Old One → Celestial Patron (step-7 combobox, major stays null → resolves, JSON ground truth in ~15 s).

## Bug 1 (PRIMARY): double CHA adder on every eligible single-target fire/radiant spell
Both live damage legs add +CHA to the same roll:
1. `src/services/rules/spells/spellCastService/execution/index.js:535` `computeRadiantSoul` appends ` + 3 [Radiant Soul]` to `finalFormula` (stored to `metaCtx.finalFormula`).
2. After Done, the attack-damage pipeline (`useAttackDamageResolution.js` → `src/services/combat/steps/index.js` → `directSpellDamageSteps.js:94 spellContext`) rebuilds `formula = ctx.attack?.damage` — which is ALREADY the augmented string — and appends ` + 3 [Radiant Soul]` AGAIN; the once-per-turn gate in spellContext cannot stop it because the flag is only written LATER in the same pipeline (`spellRollDamage` step, :134-142).

Live evidence (campaign log `rollType:"damage"` + popups, CHA +3):
- Guiding Bolt lv5: `"8d6 + 3 [Radiant Soul] [radiant] + 3 [Radiant Soul]"` rolls [2,6,4,6,6,5,4,5] **modifier:+6** total **44** — HP 85→41. Expected `8d6 + 3`, mod +3.
- Fire Bolt (fresh turn): `"3d10 + 3 [Radiant Soul] [fire] + 3 [Radiant Soul]"` 7,5,9 **mod +6** = 27 (HP 70→43). Reproduced 2/2.

## Bug 2: save-AoE fire spells neither gain the adder nor consume the once-per-turn gate
Burning Hands (MI Wizard lv1 free cast, app upcast to lv5 7d6 because warlock has no lv1 slots; radio value=1 rendered `disabled` — separate MI/upcast quirk):
- Save results popup: "Unicorn 1: Failed — takes 14 Fire damage (rolled 8) / Ogre Zombie 1: Failed — takes 21 Fire damage (rolled 8)" (DC 16 = 8+CHA3+PB5 exact).
- Per-target damage logs: `formula:"7d6"` **no [Radiant Soul] at all**, modifier 0 — the adder leg (`execution/index.js` direct damage path) never runs for the NPC save-AoE rolls, so "add CHA … against one of the spell's targets" is unmodeled on save-AoE spells.
- Consumption bypass: `_radiantSoul_HexWarlock_oncePerTurn` was NOT written by this fire cast (`flagLive:false` via in-page `getRuntimeValue`), so the IMMEDIATELY following Fire Bolt same turn STILL got `"3d10 + 3 [Radiant Soul] [fire] + 3 [Radiant Soul]"` mod +6 (total 32, HP 32→0). Once-per-turn is therefore bypassed once per AoE cast (always-on repeat window).
- No target-picker UI exists anywhere for the "one of the spell's targets" choice (grep: no consumer keys off a per-target selection).

## What PASSED (keep exact in any fix)
- Radiant resistance LIVE-exact: Unicorn Radiant Horn `1d10+4: 1+4` = 5 raw → holder HexWarlock popup "2 damage applied … (reduced from 5) — HP 73→71" = floor(5/2); control LightfootHalfling identical roll raw 5 → **full 5** HP 28→23.
- Once-per-turn WRITE/RESET on direct path: flag set true at first eligible cast, reset false at owner turn start (`radiant_soul_turn_start` collector → `rules/effects/turnStartEffects.js:97`); turn-2 re-arm verified (flag false at round 5 turn start).
- Second spell same turn (direct path): Fire Bolt after Guiding Bolt = `3d10 [fire]` 17, NO adder — gate works between direct casts.
- Damage-type gate: Ray of Frost (cold) with flag re-armed = `3d8 [cold]` 17, no adder — exact.
- Attribution: non-holder DraconicSorcerer Fire Bolt = `2d10 [fire]` 11, no adder.

## Suggested fix
Single-source the adder. Simplest: delete the append in `computeRadiantSoul`/execution (`index.js:535` + `damageCalculation.js:74`) and let the pipeline `spellContext` own it — but then per-target save-AoE still needs a consumer + a one-target model (e.g. stamp `pendingRadiantSoulTarget` from the first eligible target of the cast and add +CHA only in that target's roll in `handleNpcSaveDamage.js`, marking the key at save-damage application time). Keep `spellRollDamage` flag write (direct) and add the equivalent write on the save-AoE path.

## Fixme cleanup state at handoff
- HexWarlock PERMANENTLY Celestial Patron lv14 (reusable for radiant tests) + `magicInitiateInstances:[{class:'Wizard', cantrips:['Fire Bolt','Ray of Frost'], level1Spell:'Burning Hands'}]` persisted in JSON.
- HP drift from test damage: HexWarlock 71, LightfootHalfling 23, Ogre Zombie 0, Unicorn 72; `_radiantSoul_HexWarlock_oncePerTurn`, slots (lv5 2→1 via Burning Hands upcast) etc. cleared via Admin Clear Change Data + Clear Campaign Log + monster removal at handoff.
