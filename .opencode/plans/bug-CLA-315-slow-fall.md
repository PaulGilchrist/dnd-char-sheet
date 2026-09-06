# BUG CLA-315 — Slow Fall (Monk, 2024): ungated generic damage_reduction row; no fall model; no Reaction spend

**VERDICT: FAIL** (pitfall-23 verdict policy: unenforced trigger + no reaction spend = FAIL even though reduction math is exact)

## Character / rig
- Disciplined_Monk lv17 Human Monk (Warrior of Shadow) 2024, AC 17, HP 122/122, test-campaign.
- EB Thug 1 joined (Mace +4, 1d6+2 Bludgeoning — RAW falling-damage type proxy), target armed = Disciplined_Monk, walked Next×14 to Thug 1 turn (pitfall 30, per-click change-data verified).

## What works (exact)
- Row "Slow Fall:" surfaces in sheet Reactions section (`automationRouter.js:105` damage_reduction ct='1 reaction' → reactions.push).
- Click after a hit on self executes `handlers/combat/damageReductionHandler.js:101`:
  - Popup: "Slow Fall: Reduce damage by **5 * monk level = 85** … Deflect roll: 5 * monk level = 85 … **Damage reduced to: 0**" — expression math EXACT (`automationExpressions.js:101` monk level→17).
  - Model = post-damage HEAL: `actualHeal=min(reduction,totalDamage)` (:180). Live: mace HIT 17 vs AC 17 → 4 bludgeoning, HP 122→118 (`hp_change delta:-4`), row click → +4 heal → HP 122 (`hp_change delta:+4 cur:122` note "5 * monk level = 85 HP from 4 damage reduced by Slow Fall").
  - `ability_use` log: "Disciplined_Monk used Slow Fall to reduce damage by 5 * monk level = 85 (healed for 4 HP)." — names Slow Fall.

## FAIL defects (live + grep proven)
1. **No fall mechanism anywhere; trigger `falling` unenforced.** `matchesTrigger` (damageReductionHandler.js:59-81) has branches ONLY for `bludgeoning_piercing_slashing_damage` / `any_damage` / `ranged_weapon_attack_hit`; `falling` falls through `return true` (:80). LIVE: the row fired against a **Thug Mace weapon attack** and spent "reduce damage by 85" on 4 mace damage — Slow Fall is live on EVERY attack against the monk (any lastAttack satisfies it). No auto-prompt on any event (row is clickable anytime; cannotAct = condition-gated only, CharSheet.jsx:392).
   - grep proof no producer of fall damage: `rg -iw falling src/ --glob '!*.test.*'` → only aura console.warn text, randomEventService text-only flavor, `fa-person-falling` icon. `rg "Falling" public/data/monsters.json` → zero. elevation↔damage: `rg -l elevation src` files contain no `damage` — terrain elevation is cosmetic; hazard POIs (outdoorConfig/EventDialog/HazardSVG) carry no damage field/consumer.
2. **No Reaction economy / no latch.** Zero reaction spend: no `reaction` key, no `_Slow_Fall_usedRound` stamp (monk bucket change-data lists latches for other features — none for Slow Fall), handler never stamps or refuses. LIVE: immediate second click on the SAME stale lastAttack re-fired with second `ability_use` "used Slow Fall to reduce damage by 5 * monk level = 85 (no healing needed)." — unlimited re-use, no refusal popup (CLA-297/310 latch precedent absent).
3. **Trigger semantics inverted vs RAW:** RAW reduces FALL damage (bludgeoning from falling); app consumes the reaction (well, doesn't even) on arbitrary attacks, and only ever "reduces" retroactively by healing — if the monk is at high HP the popup still claims "Damage reduced to 0" while nothing about falling is modeled.

## Fix direction (house precedent)
Gate `matchesTrigger` add `falling` branch that REFUSES (automation_info popup "you are not falling") until a fall producer exists; since the app has NO fall-damage producer, either (a) build a GM fall-damage tool (initiative card action or map elevation drop writing `lastAttack {damageTypes:['bludgeoning'], trigger:'falling'}` + hp_change) that the row consumes, or (b) inert the row (specialActions display) — do not leave a row that eats any attack. Add `_Slow_Fall_usedRound` round latch (CLA-297 recipe: stamp holder `playerStats.name`, clear at round-wrap in navigationHandlers + initiative).

## State after test
EB Thug 1 in combat; Thug target=Disciplined_Monk; lastAttack=Thug→Monk 4 bludgeoning; monk back at 122/122; Admin cleared change-data + campaign log after capture.
