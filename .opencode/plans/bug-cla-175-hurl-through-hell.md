# BUG — CLA-175 Hurl Through Hell: Incapacitated never expires; "returns to space it occupied" never resolves

**Verdict: FAIL** (2026-08-29, Playwright-only, test-campaign, 2024 ruleset)

## What works (verified live, HexWarlock lv14 Fiend Patron vs Ogre 1)

- 2024 data present: Warlock → Fiend Patron lv14 `automation.type: hurl_through_hell` (8d10 Psychic, CHA save, uses 1, pactMagicRecharge).
- Feature surfaces on sheet Special Actions after wizard subclass switch Celestial→Fiend + level 10→14 (`public/campaigns/test-campaign/HexWarlock.json` ground truth).
- After EB HIT (d20 15+8=23 vs AC 11), clicking "Hurl Through Hell:" → handler gates pass → modal `HurlThroughHellModal.jsx` with correct text: "CHA saving throw (DC 16)", "29 Psychic damage (if not a Fiend)", "Uses available: 1 / 1 (Long Rest)".
- Confirm → `.sp-overlay` "Saving Throw Required — Ogre 1 … DC 16" → Roll Save → SAVE FAILURE (d20 13 + −2 = 11 vs DC 16).
- Fail branch: damage popup "Ogre 1 failed CHA save — hurled through the lower planes and takes 31 Psychic damage"; HP math exact 55 → 24 (8d10 = 31, log `(3, 2, 3, 3, 2, 2, 10, 6)`); "Incapacitated" badge on Ogre card; change-data `targetEffects` entry `{target:"Ogre 1", source:"Hurl Through Hell", effect:"incapacitated", duration:"until_end_of_next_turn", teleport:true, returnToSpace:true}`; log: "Hurl Through Hell triggered — Ogre 1 must make CHA save (DC 16)…", save_result, damage roll, "Bloodied (-31)".
- Uses consumed: `HexWarlock.hurlThroughHellUses = 1` (1→0 remaining). Second click same turn → popup "Already used this turn. Once per turn." (oncePerTurn gate works).

## The bug — duration + return never implemented

Woke turns with `Next →` until **round 4** (hurl fired in round 1; "until end of your next turn" = end of HexWarlock's round-2 turn — long passed):

```
round: 4, active: AasimarTest
Ogre 1.activeConditions: ["incapacitated"]   ← still applied 2+ rounds late
targetEffects: [ ...until_end_of_next_turn, returnToSpace:true ]  ← never removed
Ogre 1.pendingExpirations: []
HexWarlock.pendingExpirations: []
```

Root cause (code, static):
1. `src/components/char-sheet/modals/HurlThroughHellModal.jsx:74-90` writes `activeConditions` + `campaign.targetEffects` **directly** (bypassing `conditionHandler.js`, which is where `until_end_of_next_turn` durations get converted into `pendingExpirations` entries — see `conditionHandler.js:92`) and never enqueues anything to `expirationQueue.js`.
2. `expireStaleEffects.js` only consumes `pendingExpirations` (empty here) — nothing else sweeps hurl te's.
3. `grep -rn "returnToSpace" src` → only the modal's own inert flag; `conditionEffects.js:433-440` sets `effects.hurlThroughHell = true` / `conditionDuration` but **no consumer ever clears the condition, removes the te, or resolves the "returns to the space it previously occupied" teleport** anywhere in src.

Net: the Ogre is Incapacitated permanently (until manual removal / combat restart clears `hurlThroughHellTurnUsed` only — conditions persist), and the "disappears … returns" round-trip is a cosmetic popup with no state resolution.

## Secondary observation (not filed)

`hurlThroughHellTurnUsed` persisted as `"unknown"` (`getRuntimeValue(playerName,'currentTurn')` unset) — cosmetically fine, gate still works within/across the observed session; verify separately if turn-scoped reset matters.

## Fix recipe

On save-fail in the modal (or better, in the handler), enqueue via `expirationQueue` (`expireForCreature`/target queue) an entry `{ condition: 'incapacitated', expiresRound: currentRound + <rounds until caster's next turn end>, expiresOnCreature: casterName }` plus a matching te-cleanup for the `effect:'incapacitated', source:'Hurl Through Hell'` entry in `campaign.targetEffects`; add a turn-end hook keyed on `te.effect === 'incapacitated' && te.returnToSpace` that logs "Ogre 1 returns to the space it previously occupied" and strips condition + te.

## Cleanup performed

Ogre removed from initiative, HexWarlock Long Rested, Admin → Clear Change Data + Clear Campaign Log. HexWarlock intentionally kept at Fiend Patron lv14 (registry updated).
