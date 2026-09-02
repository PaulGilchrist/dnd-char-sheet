# CLA-109 Eldritch Strike — fires only once per encounter, never re-arms on later turns

## Overview
Eldritch Strike (Eldritch Knight lv10, 2024) is implemented as an auto-applied attack rider in
`src/services/combat/steps/features/eldritchStrikes.js` (featureRiders step of the weapon-damage
pipeline, `attackRollPostDamage.js:14-32`). The first weapon hit of the encounter works: it writes
the `disadvantage_on_next_save` targetEffect, logs the ability_use entry, gates once-per-turn, and the
save spell consumes it. But the feature NEVER re-arms on any subsequent turn: all later weapon hits
produce no targetEffect and no log. Live-proven across rounds 1-3 with EvasiveFighter.

## Expected Behavior (canonical app-data wording)
`public/data/2024/classes.json` Fighter → major "Eldritch Knight" → feature level 10:
> "When you hit with a weapon attack, target has Disadvantage on next saving throw against your spell."
automation: `{ type: "attack_rider", trigger: "weapon_attack_hit", oncePerTurn: true,
options: [{ name: "Eldritch Strike", effect: "disadvantage_on_next_save" }] }`

"once per turn" implies it must re-arm and fire again on each of the fighter's turns.

## Actual Behavior
- Round 1, hit #1 (ts 1788319966029, Shortsword d20 14+6=20 vs AC 8 Zombie 1):
  - change-data `targetEffects`: `[{ target:"Zombie 1", source:"Eldritch Strike", option:"Eldritch Strike",
    effect:"disadvantage_on_next_save", duration:"until_start_of_next_turn" }]`
  - log: `EvasiveFighter used Eldritch Strike on Zombie 1, imposing Disadvantage on the target's next saving throw.`
  - `EvasiveFighter._Eldritch_Strike_usedRound` = 1
  - Burning Hands (DEX DC 13) at Zombie 1: NPC save consumed the te
    (`SaveAttackAoeModal.jsx:91-93,143-146` min-of-two roll), log `saveRawRolls:[13,13]`, fail, 9 fire dmg.
- Round 1, second hit (miss then hit ts 1788320435391, round still 1): correctly gated, no extra te (miss also correctly silent).
- Round 2 hit (ts 1788320584949, d20 11+6=17 vs AC 13 LightfootHalfling): NO targetEffect written,
  NO "used Eldritch Strike" log. `combatSummary.round` = 2, `_Eldritch_Strike_usedRound` stuck at 1.
- Round 3 hit (ts 1788320968051, d20 14+6=20 vs AC 13): again NO te, NO log. change-data after round 3:
  `targetEffects: []`, `_Eldritch_Strike_usedRound: 1`, `round: 3`, total Eldritch Strike log entries = 1.
- Downstream effect: LightfootHalfling's PC save prompt (round 2 Burning Hands) rolled a SINGLE d20
  ("d20 (15) + 3 = 18 vs DC 13") — correct given the te was never re-armed, i.e. the rider is absent.

## Steps to Reproduce
1. test-campaign, EvasiveFighter (Fighter lv18, 2024, Eldritch Knight, INT 8 → spell DC 13, Burning Hands auto-assigned).
2. Encounter Builder → "Select Zombie" → Join Encounter.
3. Initiative view: set EvasiveFighter card Target = Zombie 1; attack with Shortsword (HIT) → te + log appear, `_Eldritch_Strike_usedRound` = 1.
4. Cast Burning Hands at Zombie 1 → te consumed, save failed.
5. Walk initiative (`Next →`) a full cycle so `combatSummary.round` = 2 (or 3), land back on EvasiveFighter.
6. Set Target = LightfootHalfling (or any live creature), attack (HIT, popup "✓ HIT ... vs AC").
7. Observe: no "Eldritch Strike" ability_use log, `targetEffects` stays `[]`, `_Eldritch_Strike_usedRound` stays 1. Feature dead for the rest of the encounter.

## Likely Location
`src/services/combat/steps/features/eldritchStrikes.js:17-18`:
```js
const round = getCurrentCombatRound();   // BUG: campaignName not passed
if (rider.oncePerTurn && getRuntimeValue(ctx.playerStats.name, key, ctx.campaignName) === round) continue;
```
`getCurrentCombatRound(campaignName)` → `getCombatSummary(campaignName)` returns `null` when
`campaignName` is falsy (`combatData.js:46-49`), so the fallback `1` is ALWAYS used. The key is
written as `1` on the first fire, then gate compares `1 === 1` forever → permanent skip.
Secondary hardening gap: no per-turn reset consumer for `_Eldritch_Strike_usedRound`
(`navigationHandlers.js:42-54` and `useInitiativeEffects.js:344-356` reset every other
`*_usedRound` key but not `_Eldritch_Strike_usedRound`), so the fix should either pass
`ctx.campaignName` (round-increment then suffices) or add a reset branch.

## Notes
- Consumers of `disadvantage_on_next_save` all exist and are correct-ish:
  `handleNpcSaveDamage.js:34-38` (consume + `rollSaveForCreature(..., disadvantage, ...)` +
  `forcedMode`), `useLoggedDiceRollSaves.js:144-148` (PC prompt roll),
  `SaveAttackAoeModal.jsx:91-93,143-146` (min-of-two roll + consume), registry entry
  `targetEffectDefinitions.js:223-230` ("Save Disadv (Next)").
- Logging-fidelity gap in `SaveAttackAoeModal.jsx:137`: `saveRawRolls: [saveRoll, saveRoll]` is a
  fabricated duplicate of the already-minified final roll — the AOE save log can NEVER show genuine
  two-d20 disadvantage evidence (`[13,13]` on the disadvantaged save is indistinguishable from a
  normal save in this data). Cosmetic/testability issue, same file family.
- `SaveAttackAoeModal.jsx:198`: PC save prompts get `disadvantage: heightenTarget === targetName`
  only — the rider te is not forwarded at prompt-send time; it is only picked up if the
  `useLoggedDiceRollSaves` listener re-reads targetEffects at roll time. Not reproducible as a
  failure here because the round-gate bug removed the te before the PC prompt stage.
- Manifest paths (`classFeatureHandler.js` / `classFeatureRouter.js` / `classFeatureInfoBuilder.js`)
  are stale — the live implementation is the `featureRiders` pipeline step + feature step file above.
- Hit-gating itself is correct (miss produced no te); only the once-per-turn gate is broken.
- EvasiveFighter LEFT as Eldritch Knight lv18, 2024 (reusable for post-fix retest). Runtime change-data
  + campaign log cleared; Zombie 1 removed from initiative.
