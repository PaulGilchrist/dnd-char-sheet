# Bug CLA-216 — Lucky (Halfling racial trait): auto-reroll on natural 1 never fires

## Title
CLA-216 Lucky (Halfling, 2024 racial trait) — natural-1 auto reroll never triggers; the nat 1 is used as-is

## Overview
The 2024 Halfling "Lucky" trait is implemented as an AUTOMATIC reroll model (`auto_reroll` / `target:'d20'` / `condition:'roll_equals_1'`), distinct from the FT-049 Lucky feat adv/dis model. The automation chain correctly builds the context flags (`autoReroll:true`, `autoRerollCondition:'roll_equals_1'`), but the sole consumer `computeD20Roll` compares an UNINITIALIZED variable against 1, so `isLuckyReroll` is always false. Verified in-app on LightfootHalfling (2024 Halfling Fighter lv3): natural 1 rolled, no reroll happened, no Lucky banner, no log entry, and the nat 1 total was applied. The manual reroll button is intentionally hidden for this condition (`DiceRollResult.jsx:376`), so there is no fallback — the trait is completely inert.

## Expected
When a Halfling rolls a 1 on the d20 of a d20 Test, the app automatically rerolls the d20 and uses the new roll (banner "Lucky (Halfling): rerolled natural 1 → N" in the roll popup + log "used Lucky (Halfling trait): rerolled natural 1 …", per `DiceRollResult.jsx:135-137/370-372` and `useLoggedDiceRollAttack.js:132-137/222`).

## Actual
Nat-1 stands: popup shows the raw d20 1 and total 1+bonus; no reroll, no banner, zero Lucky log entries.
- UI (25 ability-table rolls on LightfootHalfling): nat-1 popup "Strength 2 d20 1 +1 (+1 to hit)" — nat 1 used, no Lucky UI.
- Log (`/api/campaigns/test-campaign/log`): entry `rolls:[1], isNatural1:true, total:2, mode:"normal"`, no `luckyRerolled` field; `luckyCount:0` across all entries.
- Isolation probe (in-page `computeD20Roll` × 200 with exact halfling ctx `{autoReroll:true, autoRerollCondition:'roll_equals_1'}`): 7 natural-1 results, `luckyRerolled` fired 0 times, `effectiveD20Roll` stayed 1.
- Modifier plumbing proven healthy: `collectSaveModifiers` on the races.json trait yields `{source:'Lucky', target:'d20', condition:'roll_equals_1', effect:'reroll'}` → `conditionEffectsInternal.js:231-239` sets `autoRerollForChecks` + `autoRerollCondition` → `CharAbilities.jsx:196-199/227-228` injects into roll ctx. "Lucky:" sheet row is a passive non-clickable row (`luckyClickableCount:0`) — auto model by design, no manual path exists.

## Steps
1. App → test-campaign → LightfootHalfling sheet (2024 Halfling Fighter lv3; "Lucky:" passive row present).
2. Click a Strength ability-table cell repeatedly (auto-rolls) until the popup shows `d20 1`.
3. Observe popup: raw nat 1 kept, no "Lucky reroll" display, no reroll banner.
4. Campaign log: nat-1 roll entry recorded verbatim; no Lucky reroll log ever written.

## Likely Location
`src/hooks/combat/d20RollComputation.js:21`:
```js
let effectiveD20Roll;               // :15 — undefined here
const isLuckyReroll = context?.autoReroll && context?.autoRerollCondition === 'roll_equals_1' && effectiveD20Roll === 1;  // undefined === 1 → always false
```
Fix: gate on `effectiveD20 === 1` (or `r1 === 1`) AND apply the reroll AFTER the forcedMode block (:124-130), which currently clobbers `effectiveD20Roll` back to `effectiveD20`/adv-dis — a second latent flaw that would discard `luckyRerollValue` even if :21 were fixed in place. Suggested: after :130, `if (context?.autoReroll && context?.autoRerollCondition === 'roll_equals_1' && effectiveD20Roll === 1) { luckyRerollValue = rollD20(); effectiveD20Roll = luckyRerollValue; luckyRerolled = true; }`.

## Notes
- Roll-type caveat observed: ability-table cell clicks log `rollType:"save"` for Strength cells in this build; d20 target in data maps only to `autoRerollForChecks` (`conditionEffectsInternal.js:234`) — `autoRerollForSaves` is NOT set by the 'd20' target, so monster-forced `.sp-overlay` saves would also miss Lucky even after the :21 fix. Rule text says "a d20 Test" (attack/save/check all included) — plumbing should cover saves/attacks too.
- Popup always rolls r2 alongside r1 and logs `[r1, r2]` when not luckyRerolled (`useLoggedDiceRollAttack.js:222`) — that's why nat-1 entries can show two dice; cosmetic.
- Registry: keep LightfootHalfling for retest after fix.
