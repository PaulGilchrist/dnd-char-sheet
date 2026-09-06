# BUG FT-071 — Sharpshooter cover-ignore gate also ignores FULL cover and applies to melee/spell attacks

## Title
FT-071 Sharpshooter "Bypass Cover" untyped pass-through: zeroes cover for ALL attack types including full cover (canonical: ranged weapon attacks ignore HALF and THREE-QUARTERS cover only)

## Overview
The `ignore_cover_ranged` passive (supplied by 2024 Sharpshooter `benefits[1].automation`) is consumed in `src/services/automation/contextBuilder-map.js:188-194`. The consumer unconditionally replaces the computed cover with `{ level: 'none', acBonus: 0 }` for any attack whose holder has the passive. It never checks:
1. that the attack is a ranged WEAPON attack (row text: "Your ranged attacks with weapons…"), nor
2. that the cover level is only `half`/`threeQuarter` — FULL cover (which the same function turns into `isAutoMiss` two blocks later at :248-251) is erased before that check runs, nor
3. the feat data's own `coverTypes: ["Half","Three-Quarters"]` metadata, which no code reads (grep: `coverTypes` only in feats.json + the data itself).

Half-cover and three-quarters-cover ignoring is exact and live-verified; full-cover ignoring is a confirmed live RAW violation, hence FAIL under the "close-but-not-exact (e.g. ignores total cover too)" rule.

## Expected Behavior (canonical, 2024 PHB Sharpshooter bullet 2)
"Your ranged attacks with weapons ignore Half Cover and Three-Quarters Cover."
- Half cover (+2) and three-quarters cover (+5): ignored for the holder's ranged WEAPON attacks.
- Total (full) cover: NOT ignored — still blocks the attack (auto-miss / can't be targeted).
- Melee attacks: NOT covered by this feat at all — cover still applies.

## Actual Behavior (live E2E, test-campaign, Test Map, row y=10)
Scenario: attackers FE(4,10)/FR(5,10); barrel (half) then bookshelf (¾) then painted walls (full) on cells between them and npc token "Zombie 2" (12,10); EB-joined Zombie 2 AC 8 armed as target of both.
- HALF cover — control EvasiveFighter (no feat) Shortbow: popup "1/2 Cover (+2 AC)", log `coverAcBonus:2, coverLevel:"half"` ✓; FeyRanger (Sharpshooter) Longbow: popup "✓ HIT (20 vs AC 8)" NO cover line, log `cover:null` ✓ (half-ignore exact).
- ¾ cover (bookshelf added, same line) — control EF: popup "✗ MISS … 3/4 Cover (+5 AC)", log `coverAcBonus:5, coverLevel:"threeQuarter"` ✓; FR: popup "✓ HIT (21 vs AC 8)" no cover line, log `cover:null` ✓ (¾-ignore exact).
- FULL cover (walls painted on (6,10)+(9,10)) — control EF Shortbow: popup "✗ AUTO-MISS (Target has full cover)", log `isAutoMiss:true, coverReason:"Target has full cover"` ✓ engine models full cover correctly…
  …but FeyRanger LONGBOW: popup "✓ HIT (16 vs AC 8)", log `cover:null, isAutoMiss:false, hit:true` — **hit straight through total cover. BUG.**
- Vitest pins the melee leak too: `src/services/automation/contextBuilder-map.test.js:222-230` asserts "ignores cover for melee spell attacks when ignore_cover_ranged passive exists" — a melee spell attack of a holder also loses cover (also beyond the feat's wording).
- No badge/log anywhere names "Sharpshooter" when the cover is dropped (no attribution trail).

## Steps to Reproduce
1. `npm run dev`; open http://localhost:5173 → test-campaign.
2. FeyRanger already has Sharpshooter (DEX 14, Longbow). Ensure EvasiveFighter has Shortbow equipped (added during this run).
3. Maps → Test Map → Open (sets activeMapName). Items panel: drag "FeyRanger"→(5,10), "EvasiveFighter"→(4,10), NPC→(12,10) and rename "Zombie 2". Place Barrel (8,10) [half], then Bookshelf (7,10) [¾].
4. Encounters: search Zombie → tick → Join Encounter (Zombie 2). Initiative: set target-select of FeyRanger and EvasiveFighter cards to "Zombie 2".
5. EvasiveFighter sheet → Shortbow attack → popup shows cover line ("1/2 Cover (+2 AC)" / "3/4 Cover (+5 AC)"). Dismiss/Done.
6. FeyRanger sheet → Longbow attack → popup shows NO cover line (correct for half/¾).
7. BUG PROBE: Maps → Test Map → Paint walls on (6,10) and (9,10). FeyRanger → Longbow vs Zombie 2 → popup "✓ HIT" instead of auto-miss; control EvasiveFighter vs same wall → "✗ AUTO-MISS (Target has full cover)".

## Likely Location
`src/services/automation/contextBuilder-map.js:188-194` —
```js
if (hasIgnoreCoverRanged) {
    coverResult = { level: 'none', acBonus: 0 };
}
```
Fix must run AFTER `computeCover` but scope it: apply only when the attack is ranged (`numericRange > 8` is computed above at :152-153) AND `attack.weaponType === 'ranged'` / weapon (not spell), AND only when `coverResult.level === COVER.HALF || coverResult.level === COVER.THREE_QUARTER` (respect data `coverTypes`; leave FULL intact so the :248 auto-miss branch fires). Also consider attributing the bypass (`base.coverReason = 'Sharpshooter'` / log) and updating the pinned melee-ignore vitest case (`contextBuilder-map.test.js:222`). Note Spell Sniper would need the same gate keyed by its own passive if it should keep the spell half — today's single-passive shape conflates them.

## Notes
- Supply chain is live and correct: `public/data/2024/feats.json` Sharpshooter benefit automation `{type:'passive_rule', effect:'ignore_cover_ranged', coverTypes:['Half','Three-Quarters']}` → `featBuffService.js` (parse2024Benefit :508-513) → `rules.js` allFeatures (:262) → `automationRouter.js` `case 'passive_rule'` default push → passives. Only the CONSUMER is unscoped.
- 5e `public/data/feats.json` Sharpshooter is display-only (`attack_rider` +5e benefits strings) — irrelevant to the 2024 char under test.
- Registry deltas this run (permanent): FeyRanger +Sharpshooter, Dex base 8→13 (total 14), Longbow kept; EvasiveFighter +Shortbow equipped. Test Map left with character tokens; cover props/walls removed at end of run.
- Manifest feat paths (`combat/automation/handlers/featHandler.js`) confirmed fictitious; real consumer is `contextBuilder-map.js`.
