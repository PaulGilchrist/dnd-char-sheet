# bug-cla-283 — Rage of the Wilds (Wolf) ally advantage consumer never fires

## Verdict context
CLA-283 overall PASS-subset: activation picker + Bear resistance verified live. The Wolf clause is implemented but DEAD code — not merely a gridless modeling gap.

## Defect
`src/services/combat/auras/wolfAuraUtils.js` `getWolfAdvantageAgainst` is `async` (awaits `isWithinRange`), but ALL call sites invoke it without `await`:

- `src/services/automation/contextBuilder-sync.js:490` — `const noMapWolf = getWolfAdvantageAgainst({ attackerName, campaignName, skipRangeCheck: true }); if (noMapWolf.advantage)` → reads `.advantage` off a Promise = `undefined` → never truthy.
- `src/services/automation/contextBuilder-map.js:50` — same non-awaited pattern (`wolfResult.advantage`).
- `src/services/automation/contextBuilder-map.js:102` — same non-awaited pattern (`noMapWolf.advantage`).

Secondary defect: the util signature is `({ attackerName, mapData })`. The sync no-map callers pass `{ attackerName, campaignName, skipRangeCheck }` (no `mapData`), so even WITH `await` the gridless path returns `{advantage:false}` (`players.length` early-return). The sibling duplicity consumer (`contextBuilder-sync.js:497 getDuplicityAdvantageAgainst`) IS awaited — proving the intended pattern.

## Live evidence (2026-09-03, test-campaign)
- DraconicDragon lv20 Barbarian Path of the Wild Heart raging; change-data `activeBuffs` carries `{name:'Rage of the Wilds', optionName:'Wolf', effect:'animal_rage_option'}`.
- Ally HexWarlock attacks Thug 1 (card Target=Thug 1): popup `d20 7 +8` SINGLE kept die; log roll entry `rollType:'attack', name:'Eldritch Blast', mode:"normal"` — NO advantage, while Wolf buff is live. Control identical (single d20).
- Claw-pack precedent: Lion clause in the same family has its own util with the same non-awaited wiring at contextBuilder-map.js:65 (lion is NOT awaited either — same family; sync path `getLionDisadvantageAgainst` non-awaited at contextBuilder-sync.js:511).

## Fix (minimal)
Await all three wolf call sites, and give `getWolfAdvantageAgainst` a gridless branch: accept `{ attackerName, campaignName, skipRangeCheck }` — iterate campaign combatSummary creatures (not just `mapData.players`) when `mapData` absent, matching the CLA-260/CLA-189 gridless-aura precedent (all combatants in range when no map).

## Related
- Eagle clause (`disengage_and_dash`) has NO consumer at all — popup text only; separate design gap (documented in registry/playbook, not filed as code bug since no partial implementation exists to repair).
- Playbook pitfall 29 records the wiring pattern.

## Row classification (orchestrator, 2026-09-03)
CLA-283 row = FAIL/BUG per strict verdict rules: 2 of 3 canonical clauses have zero observable delta live — Wolf (non-awaited async consumer, control probe identical) and Eagle (`disengage_and_dash` zero consumers, popup text only). Only Bear is live-exact. Subagent reported PASS-subset; reclassified to broken by orchestrator because unimplemented/zero-delta clauses are bugs, not soft gaps.
