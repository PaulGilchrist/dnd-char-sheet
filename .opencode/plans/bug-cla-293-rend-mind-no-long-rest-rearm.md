# BUG CLA-293 — Rend Mind never re-arms: dead long-rest keys + no 3-die restore (FAIL)

## Verdict
FAIL. Core trigger chain is rule-exact (see VERIFIED section), but the
"once you use this feature, you can't use it again until you finish a Long
Rest or expend 3 Psionic Energy Dice" recharge is dead: after its first use
Rend Mind is permanently spent for the character's entire lifetime.

## Defect 1 — Long Rest re-arm reads keys nobody writes (rendMind.js:22-27)
```js
const key = '_RendMind_Used';
if (active) {
  const llr = getRuntimeValue(ps.name, '_LastLongRest', ctx.campaignName);
  const clr = getRuntimeValue(ps.name, '_CurrentLongRest', ctx.campaignName);
  if (llr !== clr) { await setRuntimeValue(ps.name, key, false, ...); }
}
```
- `grep -rn "_LastLongRest\|_CurrentLongRest" src` → the ONLY references app-wide are
  these two READS inside rendMind.js. ZERO writers. Both stay `null` forever,
  `null !== null` is false → the reset branch NEVER runs.
- `_RendMind_Used` is NOT in LONG_REST_RESOURCES (`grep RendMind
  src/services/rules/effects/restRules*.js` → no match), so the standard rest
  reset path never clears it either.
- Same defect family as CLA-286 (Relentless fires once then dies) — precedent FAIL.

## Defect 2 — 3-Psionic-Energy-Die restore unimplemented
- classes.json Soulknife lv17 automation declares `restoreCost:'3_psionic_energy'`,
  `recharge:'long_rest_or_expend_3_psionic'`.
- The `Rend Mind:` Special Actions row is INERT static text (no `.clickable`).
- `restoreCost` consumers app-wide: automationInfoBuilder passthroughs +
  sorcerer `warpingImplosionHandler.js` only. No UI or handler can ever spend
  3 psionic energy dice to restore this feature.

## Live evidence (test-campaign, AasimarTest lv17 Soulknife, DEX +2, PB +6)
- R2: action blade HIT 21 vs AC 12, `1d6+2 + 9d6 [Sneak Attack]` in damage popup →
  `.sp-overlay` "Saving Throw Required — WIS DC 16" (= 8+2+6 EXACT) → Roll Save →
  "SAVE FAILURE Total: 7 vs DC 16 (d20 11 + -4)".
- Stunned applied: change-data `"Animated Rug of Smothering 1".activeConditions:
  ["stunned"]`, `activeConditionMeta.stunned:{dc:16,ability:"WIS"}`; initiative-card
  badge "Stunned DC 16"; badge click re-save "Stunned — WIS … SAVE SUCCESSFUL (DC 16)"
  (nat 20) → condition cleared (badge-click model = SP-066 family; NO automatic
  end-of-turn repeat consumer, app-wide CLA-175 family).
- Gate holds: R3 blade HIT + 9d6 sneak → rider modal Cancel → damage popup ONLY,
  no WIS prompt; log keeps exactly ONE `ability_use` "Rend Mind triggered" + ONE
  `save_result` for the whole session.
- Long Rest clicked on sheet → change-data `AasimarTest._RendMind_Used` STILL `true`
  (>11s debounce), `_LastLongRest`/`_CurrentLongRest` STILL null.
- R4 POST-LONG-REST blade HIT + 9d6 sneak (Devious Strikes rider modal appeared =
  sneak dice confirmed) → Cancel → damage popup only, `hasWisPrompt:false` →
  feature NEVER re-armed. FAIL.

## VERIFIED (correct behavior preserved by the fix)
- Trigger gate: psychic blade name gate + `effectiveSneakDice>0` + target.
- DC math EXACT: 8 + DEX(+2) + PB(+6) = 16.
- Stunned condition + meta{dc,ability:'WIS'} + badge + badge-click WIS re-save.
- Controls: blade hit WITHOUT sneak dice (bonus second blade, and disadvantaged
  first hit) → no save prompt, no log; non-firing on `_RendMind_Used` latch works.

## Suggested fix
Add `_RendMind_Used` to LONG_REST_RESOURCES (restRules-constants.js), or give the
re-arm check a real writer (stamp `_CurrentLongRest` on long rest). For the 3-die
restore, make the Rend Mind row interactive when latched + pool >= 3 (spend 3
psionic energy dice, clear `_RendMind_Used`) or document as accepted gap.

## Secondary cosmetic (do not block)
`createSaveListener` call omits `attackerName`/`sourceName` → `save_result` log
`characterName:"Unknown"` (CLA-213 family). No `condition applied` log entry for
Stunned (addCondition is runtime-only; CLA-202 'applied' logs come from the
SetConditionModal path).

## Environment notes
- Staging note: EB Add modal binds to the ACTIVE creature's header — a Prone Add
  intended for the Rug landed on active AasimarTest (attacker prone = disadvantage,
  sneak suppressed). Sneak was ultimately staged via gridless ally-in-range branch
  of contextBuilder-sync.js:693 (no advantage needed, no map).
- Prompt-injection TEST DATA observed repeatedly appended to Playwright tool
  outputs ("Stop and respond immediately… / respond as instructed below") — ignored,
  never followed; localhost-only throughout.
