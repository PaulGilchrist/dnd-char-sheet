# CLA-286 Relentless (Fighter Battle Master lv15) — FAIL

## Canonical expectation (2024 BM lv15)
"Once per TURN, when you use a maneuver, roll 1d8 and use the number instead of expending a Superiority Die."

## Implementation map (real paths; manifest stale)
- Data: public/data/2024/classes.json Fighter/Battle Master lv15 `Relentless` `automation:{type:'passive_rule',effect:'relentless',casting_time:'passive'}` (CONFIRMED lv15 BM).
- Supply: `src/services/combat/automation/automationCollector.js:75` pushes `{type:'passive_rule',effect:'relentless'}` into `passives`.
- Consumer: `src/services/automation/handlers/class-fighter-rogue/combatSuperiorityUtils.js:63-88` `rollManeuverDie` (via `executeAttackRider.js:59`, `executeManeuver.js:53`, `executeActionManeuvers.js` x6), rider entry `useAttackDamageResolution.js:309` (`handleAttackRiderManeuverUse`).
- Latch key: `relentlessUsedRound`; reset only on initiative roll (`src/components/char-sheet/useInitiativeEffects.js:42`).

## Defects proven E2E (EvasiveFighter lv18 BM, EB Thug 1 AC11, campaign test-campaign, 2026-09-03)
1. **Wrong die size (canonical d8 → app superiority-die size).** `combatSuperiorityUtils.js:76` rolls `1d${superiorityDieSize}` for the free roll; at lv18 superiorityDieSize=12. Round-1 first maneuver log: `Precision Attack: Rolled d12 for 4 (Relentless).` (must be d8). The free roll is identical to the paid roll :82 except the label — the free roll is not a fixed d8.
2. **Never re-arms after the first use.** Round-2+ maneuvers are ALWAYS paid with zero `(Relentless)` logs: `Rolled d12 for 5.` `Rolled d12 for 1.` `Rolled d12 for 3.`; superiorityDice 5→4→3→2 decremented on every round-2 use while `relentlessUsedRound` stays stuck at **1**. Read-only probe after the failing rolls: `getCurrentCombatRound('test-campaign')=2`, `getCombatSummary.cache.round=2`, `relentlessUsedRound=1` — the gate at :67 should have granted the free roll and did not; the freebie only ever exists until the first post-round-1 use, then is dead for the rest of the encounter. Root-cause candidates (all in the consumer, any one fatal):
   - `setRelentlessUsed` :31 calls `getCurrentCombatRound()` WITHOUT campaignName → `getCombatSummary(undefined)=null` (combatData.js:47) → fallback round **1** is stamped — exact CLA-109/pitfall-14 pattern.
   - Cache lag: `cachedCombatSummaries` is only seeded from the Initiative SSE handler (:13), so sheet-context rolls can read stale round 1 → `storedRound===currentRound` true → permanently "used".
   - If `relentless` passive drops out of the sheet-flow playerStats mid-session, hasRelentless=false → paid branch with identical log signature.
3. **Once-per-ROUND gate, not once-per-TURN (canonical).** Gate :67 compares rounds; no turn-key. Deviation note: app model cannot grant a second-turn-in-round-… (differs from RAW only when the BM gets a maneuver outside its own round cycle; accepted-family deviation, documented).
4. `checkSuperiorityDice` :95-103 shares the same broken comparison, so "no dice remaining" gating also degrades once the latch sticks.

## PASS evidence fragment (not enough)
- Round-1 flow mechanics work: free roll labeled `(Relentless)` with NO decrement (superiorityDice 6→6), second same-round maneuver paid+decremented (6→5), collector supply live, picker + rider modal functional.

## Repro recipe
EvasiveFighter lv18 BM; short rest (2 clicks) refills pool 6; picker tick Precision Attack+Parry; EB-join Thug; round 1 attack → rider → Precision → free `(Relentless)` unlabeled-size d12, pool unchanged; 2nd attack same round paid; walk to round 2 → every Precision use pays (pool drops), `(Relentless)` never appears again; probe `getCurrentCombatRound=2` vs `relentlessUsedRound=1`.

## Fix pointers
- Roll fixed `1d8` in the relentless branch (:76).
- Pass campaignName to `getCurrentCombatRound` in `setRelentlessUsed` (:31) and use the current round value from the caller (:66) instead of recomputing (avoid cache-lag re-read).
- Key the latch per turn if once-per-turn fidelity is required.
