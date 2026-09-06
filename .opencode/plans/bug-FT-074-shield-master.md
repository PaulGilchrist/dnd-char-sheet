# BUG FT-074 — Shield Master (2024): Shield Bash offer strands the triggering attack's weapon damage; latch mis-stamps turn owner

**Verdict: FAIL** — automation is LIVE (save prompt, choice UI, te, Prone condition, logs, once-per-turn all fire) but the attack that triggers it silently loses its weapon damage, and the once-per-turn latch is stamped for the wrong creature.

## Scenario (live, Playwright, localhost:5173, test-campaign)
EvasiveFighter (Fighter/Champion lv18, 2024, STR 12/+1, PB +6, equipped Shortbow+Shortsword+Shield, feat Shield Master added via Edit wizard Feats step, disk-verified). EB Zombie joined ("Zombie 1", AC 8, HP 15, STR save +1). No map (lenient range).

## Evidence — what WORKS
- Feat collects: sheet Special Actions row "Shield Bash:"; pipeline passive live.
- Ranged control (Shortbow HIT 22 vs AC 8): NO bash offer (lastAttack.weaponType:'ranged' rejected) — gate ✓
- Melee HIT (9 vs AC 8) → `.sp-overlay` "Saving Throw Required — Zombie 1 must make a STR saving throw. DC 15. Source: Shield Bash" ✓
- **DC exact RAW: 15 = 8 + STR(+1) + PB(+6)** ✓ (lv18 PB is +6; earlier +5 assumption was my error)
- Roll Save → "SAVE FAILURE Total: 9 vs DC 15 d20(8)+1" ✓
- Failed save → Shield Bash choice modal with Push/Prone radios + Apply Effect/Skip ✓ (choice UI exists)
- Prone applied: change-data `Zombie 1.activeConditions:["prone"]`, te `{target:'Zombie 1',source:'Shield Bash',option:'Prone',effect:'prone_and_push',value:5,duration:'until_start_of_next_turn',saveDc:15}` ✓
- Logs: roll "Shield Bash: Zombie 1 must make a STR saving throw (DC 15).", save_result "failed STR save (DC 15, rolled 8 +1 = 9)", roll "failed the STR save…effect applied.", ability_use "Shield Bash used against Zombie 1: target has Prone condition." ✓
- Once-per-turn: 2nd melee HIT same turn (18 vs AC 8) → no save prompt, no modal (silently latched) ✓

## Bug 1 (CRITICAL) — triggering attack's weapon damage never applied
Shortsword hit #1 (9 vs AC 8, Done) → campaign log has **NO hp_change**; Zombie 1 stayed 15/15. Contrast: hit #2 same turn (latch path, no modal) applied −5 (HP 15→10, hp_change logged).
Root cause chain:
- `src/services/combat/steps/features/shieldBash.js:104` returns `{modal:{type:'shieldBash'}}` from the `featureRiders` step → `actionPipeline.js:46-58` pauses with `_pausedStep:'featureRiders'` and NEVER emits `riders:applied`.
- `proceedToDamage` (the step that applies weapon damage, attackRollPostDamage.js:149-200) is downstream → never runs.
- `useAttackDamageResolution.js:293-295` `resumeAttackPipeline()` early-returns unless `_pausedStep` ∈ {cunningStrike, attackRiderManeuvers, tacticalMaster} — 'featureRiders' not allowed.
- `CharActionModals.jsx:371-374` shieldBashModal `onClose` never calls `resumeAttackPipeline` (unlike Tactical Master at CharActions.jsx:681-682).
Fix direction: add 'featureRiders' (or a shieldBash-specific paused-step marker) to resumeAttackPipeline's allow-list AND call it from the shieldBashModal close/apply handlers (both pipeline pause and Skip path), so the pipeline resumes from `riders:applied` after Done.

## Bug 2 — once-per-turn latch stamps stale creature as owner
`applyShieldBashEffect` (shieldBash.js:185-188) stamps `_Shield_Bash_usedRound` = `{round:1, activeCreature:'AasimarTest'}` while top-level `activeCreatureName` was **EvasiveFighter** (stale combatSummary mirror — pitfall 30). `checkOncePerTurnWithSkip` re-arm requires `round===storedRound+1 && activeCreature===storedCreature`; with storedCreature 'AasimarTest' the benefit will NOT re-arm at EvasiveFighter's next-turn boundary (degrades to ~once per 2 rounds).
Fix: stamp `playerStats.name` as activeCreature (the holder IS the active creature by gate contract), or read top-level activeCreatureName truth.

## Minor
- save_result log says "rolled 8 +1 = 9 — full success" on a FAILURE (suffix logic wrong).
- resolved prompt id stayed in `pendingSavePrompts` after save completed.
- No explicit 5-ft `isWithinRange` gate and no explicit Attack-action gate in the pipeline step (lenient no-map default equivalent; off-hand/bonus-action melee hits would also bash — note, not separately probed).

## Row conformance summary
| Requirement | Result |
|---|---|
| STR save DC 8+STR+PB | PASS (DC 15 exact) |
| Push 5ft OR Prone, your choice | PASS (choice modal, both wired) |
| Once per turn | PASS same-turn block / FAIL re-arm (stale-owner stamp) |
| Trigger on melee hit w/ shield | PASS (fires) |
| Ranged / no-shield gate | PASS (ranged control; shield gate code+vitest) |
| Attack still deals its damage | **FAIL — damage stranded** |

## Cleanup
Admin cleared change-data + campaign log after capture; dev servers killed. EvasiveFighter keeps Shield Master feat + STR featIncrease 3 (wizard save also applied a THIRD feat ASI point — side anomaly, featIncrease 1→3 for one ASI feat; non-core, flagged).
