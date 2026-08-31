# Bug CLA-235 — Nature's Sanctuary duration never expires (expiryRounds null)

## Title
CLA-235 Nature's Sanctuary: 1-minute duration unenforced — sanctuary persists past round 10 (addExpiration called without rounds)

## Overview
Nature's Sanctuary (2024 Circle of the Land Druid lv14, `src/services/combat/automation/handlers/class-ranger/naturesSanctuaryHandler.js` — manifest paths `src/services/combat/automation/handlers/classFeatureHandler.js` stale) activates correctly: Wild Shape use spent, runtime sanctuary state (`naturesSanctuaryActive/Creatures/Range/Resistance`) written, Half Cover + Nature's Ward resistance badges render, and the bonus-action Move leg works with delta logging. However, the effect NEVER expires at its 1-minute (10-round) duration. The activation enqueues a `remove_natures_sanctuary` expiration WITHOUT a rounds argument, so the queue entry stores `expiryRounds: null` and `processExpirationList` treats null as `Infinity` — the sanctuary (cover + resistance badges, runtime state) lives until initiative is re-rolled / change-data cleared (`clearAllExpirationEffects`), not after 1 minute.

## Expected
Duration "1_minute" = 10 rounds. At the druid's ~10th subsequent turn start (round ≥ appliedRound+10), `processExpirationList` should fire `clearExpirationEffects` case `remove_natures_sanctuary` (clearExpirationEffects.js:214-219): `naturesSanctuaryActive/Creatures/Range/Resistance/Moves` all cleared; Sanctuary badges disappear from initiative cards.

## Actual
After walking initiative round 1 → round 12 (242 `Next →` clicks, past the 1-minute mark):
- change-data: `Wild_Sage_Druid.naturesSanctuaryActive: true`, `naturesSanctuaryCreatures: ["Wild_Sage_Druid","AasimarTest","Disciplined_Monk"]`, `naturesSanctuaryRange: 120`, `naturesSanctuaryResistance: "Lightning"` — all unchanged.
- `pendingExpirations` entry persists: `{target:"Wild_Sage_Druid", effects:[{type:"remove_natures_sanctuary"}], appliedRound:1, expiryRounds:null, expireOnCreatureName:null}` — never consumed.
- UI: "Sanctuary" badges still on AasimarTest / Disciplined_Monk / Wild_Sage_Druid initiative cards at round 12 ("Nature's Sanctuary: Half Cover (AC +2), Lightning resistance"). Zero console errors.

## Steps to Reproduce
1. test-campaign, Wild_Sage_Druid lv20 Circle of the Land (2024). Set land type Temperate via Special Actions "Circle of the Land Spells:" row (→ Lightning Nature's Ward).
2. Encounter Builder → tick "Zombie" → Join Encounter (stages combat, round 1).
3. Druid sheet Actions → "Nature's Sanctuary:" → CreatureSelectionModal → tick Wild_Sage_Druid + AasimarTest → "Create Sanctuary (2)" → popup "activated! … Lasts 1 minute."
4. Verify change-data: `wildShapeUses 4→3`, `naturesSanctuaryActive true`, `Creatures`, `Range 120`, `Resistance "Lightning"`, pendingExpirations entry with `expiryRounds:null`.
5. (Optional move leg) Bonus Actions "Nature's Sanctuary (Move):" → toggle Disciplined_Monk → "Move Sanctuary (3)" → creatures list + delta log update correctly.
6. Initiative view → click "Next →" 220+ times until header reads round ≥ 11.
7. Observe sanctuary still active: badges remain, runtime keys unchanged, queue entry never processed.

## Likely Location
`src/services/automation/handlers/class-ranger/naturesSanctuaryHandler.js:62-64` —
`addExpiration(playerName, playerName, [{ type: 'remove_natures_sanctuary' }], campaignName)` omits the `rounds` parameter (5th arg of `expirationQueue.js:10`), so `expiryRounds: rounds ?? Infinity` → Infinity. Fix: pass 10 (or parse `auto.duration === '1_minute'` → 10 rounds; a `parseDurationRounds`-style helper already exists in the expiration family).

## Notes
- Residual-flag bypass family (bug-cla-191 temp-teleport no-enqueue, CLA-175/194/202 no-end-of-turn consumers); here the enqueue happens but with Infinity rounds, so even the standard expirationQueue consumer cannot fire.
- Verified working legs (PASS subset): (a) Wild Shape expend 4→3; (b) runtime area state range 120 / cube 15ft / duration metadata in popup + data; (c) Half Cover modelled via `naturesSanctuaryCreatures` list — initiative-card badges on covered creatures only (Zombie control has none); map attack consumer `contextBuilder-map.js:197` grants `coverResult half acBonus 2` with coverReason (grid-only, unexercisable gridless); (d) Nature's Ward resistance resolves correctly from `_circleOfTheLandType` (CharSheet.jsx:111-115 injects into class.major/subclass.type; Temperate → Lightning); (e) bonus-action move with pre-selected picker, creatures-list update, and Added/Removed delta log.
- Secondary gap (minor): `auto.movesPerDuration:1` is never tracked — `naturesSanctuaryMoves` is never written; Move re-fires unlimited (per-turn BA limit is implicit-only), and the clear case references `naturesSanctuaryMoves` which is never set.
- Run was cleaned: Zombie removed, change-data + log cleared, druid Long Rest.
