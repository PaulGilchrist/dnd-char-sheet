# Bug Report — CLA-198 Inner Radiance (Aasimar racial, 2024)

**Status: VERIFIED: FAIL** (2026-08-29)

## Overview
Inner Radiance (Aasimar 2024 racial transformation, activated via the "Celestial Revelation:" Special Actions row) activates cleanly — buff, badge data, uses consumption, and re-use blocking all work. But the core automation — Radiant damage (= PB) to each creature within 10 ft **at the end of each of the caster's turns** — never recurs after the one-off burst applied at activation. Across 3+ full initiative rounds of `Next →` turn-walking with a Skeleton 1 in the encounter, the Skeleton took zero further damage and zero damage entries were logged past activation.

## Expected Behavior
Bonus action transformation (1 min, once/long rest). At the END of each of the Aasimar's turns, each creature within 10 ft takes Radiant damage = proficiency bonus (+5 at lv14), logged, recurring every round for ~10 rounds.

## Actual Behavior
1. **Activation (works):** Modal → choose Inner Radiance → `innerRadianceActive=true`, `_celestialRevelationUses` 1→0, activeBuffs entry `{name:'Inner Radiance', effect:'inner_radiance'}`, `pendingExpirations` entry, log "Inner Radiance used". Re-click blocked: popup "Celestial Revelation has been used and cannot be used again until a Long Rest." ✓
2. **Wrong-time burst at activation:** `confirmCelestialRevelation` (`src/services/automation/handlers/class-sorcerer/celestialRevelationHandler.js:167`) calls `applyAuraDamage` IMMEDIATELY on activation, not at turn end: Skeleton 13→8 plus **-5 to every other PC in the campaign** (log shows ~18 simultaneous `hp_change delta:-5` entries the instant Transform was clicked; eventually pushed LightfootHalfling to death saves).
3. **No recurrence (core failure):** Across ~58 `Next →` clicks spanning rounds 2–4 (including passing the END and the next START of the Aasimar's turn), Skeleton HP frozen at 8; only ONE `hp_change` log entry ever existed for the Skeleton during UI walking. No console errors.
4. **Damage logic itself is fine:** a direct in-page diagnostic call `applyTurnStartEffects('AasimarTest', computedStats, 'test-campaign', …)` ticked exactly -5 then clamped (Skeleton 8→3→0; log deltas -5, -3) — correct PB amount, persisted to change-data. So the collector emits `inner_radiance_turn_start` and `auraDamageService` works; only the wiring never invokes it.
5. **No badge:** no Inner Radiance/light badge renders on the sheet or initiative card — `CharSummary.jsx:75` subscribes `innerRadianceActive` with `void` only; no consumer renders it (`grep "Inner Radiance" src/components/char-sheet/` hits only the modal option text).

## Steps to Reproduce
1. test-campaign → Encounters → search "Skeleton" → tick exact row → Join Encounter (initiative order: [Skeleton 1(init 9), AasimarTest, …18 PCs]).
2. AasimarTest sheet → Special Actions "Celestial Revelation:" → radio Inner Radiance → Transform. Observe popup + immediate -5 to Skeleton AND all PCs. Dismiss Done.
3. Initiative view → click `Next →` through the entire round and the next 2 rounds, passing the Aasimar's turn end (Skeleton 1→AasimarTest step) and her next turn start.
4. Observe Skeleton HP never moves past 8; campaign log has no further Inner Radiance damage entries; `change-data.combatSummary.lastAppliedTurnStartCreature` only ever `"<round>:Skeleton 1"`, never `":AasimarTest"`.

## Likely Location
- **Primary:** `src/components/initiative/navigationHandlers.js:31-36` — `createNextCreatureHandler` returns early when `roundIncrement` is falsy, so `applyTurnStartEffects` (line 73) is ONLY called when the turn wraps to initiative index 0 (`getNextCreatureName` returns `roundIncrement:true` only on last→[0] wrap, `initiativeService.js:70-77`). With Skeleton 1 at index 0, the Aasimar's turn-start step (index 0→1) is non-wrap → turn-start effects never run for her → the aura never ticks. Evidence: gate ref/server value `lastAppliedTurnStartCreature` only ever written as `"<n>:Skeleton 1"` across 4 rounds.
- **Secondary (timing model):** `src/services/rules/effects/turnStartEffects.js:97-102` — the aura is modelled as the OWNER's turn-START (gated by `innerRadianceActive` on `activeName`), not turn-END; no turn-end consumer exists. Even if navigation fired it, it would tick at the wrong boundary.
- **Secondary (multi-tick):** that `applyAuraDamage` call sits unconditionally inside the `for (const effect of turnStartEffects)` loop — with AasimarTest's 3 entries (`inner_radiance_turn_start`, 2× `steady_aim_clear`) it applies damage once PER entry per invocation (diagnostic call applied -5 then -3-to-death in a single invocation).
- **Cosmetic:** no badge consumer for `innerRadianceActive` in `src/components/char-sheet/char-summary/CharSummary.jsx`.
- Manifest paths (`classFeatureHandler.js`/`classFeatureRouter.js`/`classFeatureInfoBuilder.js`) do not exist — stale.

## Notes
- Activation half is solid: level gate (lv≥3), 1/long-rest uses (`_celestialRevelationUses`), buff, expiration queue entry, log, re-use block popup all verified live.
- Activation burst hits allies too — RAW Inner Radiance says "each creature", so ally damage is rules-correct, but the TIMING (activation moment instead of turn end) is not.
- Data is correct: `public/data/2024/races.json` Aasimar trait 6 `damage_aura`/`proficiency_bonus`/`10_ft`/`1_minute`; collector (`src/services/combat/automation/turnStartEffects.js:101`) emits `inner_radiance_turn_start` from raw traits (verified live probe); `playerStats.proficiency=5`, `turnStartEffects` non-empty on real computed stats (verified live via `rules.getPlayerStats`).
- Cleanup: death saves resolved via `.dsp-overlay` loop, Skeleton card removed (confirm carries live HP), Admin **Clear Change Data** + **Clear Campaign Log** both executed and confirmed (`change-data`: creatures [], round/lastApplied/aura/uses all null; log total 0). No source code was modified; only registry + playbook docs updated (manifest `verified` field intentionally untouched).
