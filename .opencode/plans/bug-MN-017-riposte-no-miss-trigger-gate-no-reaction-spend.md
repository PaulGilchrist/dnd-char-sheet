# BUG MN-017 — Riposte (Battle Master): row fires with no miss-trigger enforcement, no Reaction spend, leaks pending die on miss

> Converted from subagent PASS-subset to FAIL per GM verdict rule (2026-09-02): a feature that works but ignores its rule gates ("fires on successes, skips proficiency checks") is a BUG, not a PASS-subset. Same family as CLA-297 Retaliation (`bug-cla-297-retaliation-no-reaction-or-range-gates.md`). Evidence below is the verification run's own live + grep evidence.

## Overview
MN-017 "Riposte" (2024 Battle Master maneuver) implements correct DAMAGE math, but its TRIGGER is unenforced: the "Riposte:" Reactions row is clickable at any time (own turn, after being HIT, with no miss at all), spends NO Reaction, expends its superiority die even when the riposte attack misses, and leaks a stale `pendingRiposteDieValue` onto the next hit. No `ability_use` log is written (violates repo rule "every automation must log").

## Expected Behavior (canonical)
> "When a creature misses you with a melee attack roll, you can use your Reaction and expend one Superiority Die to make a melee attack with a weapon or an Unarmed Strike against the creature. If you hit, add the Superiority Die to the attack's damage roll."

Manifest trigger: `melee_attack_miss`; action type: reaction. Canonical die at lv18 = d12 (Ultimate Combat Superiority) — app matches.

## Actual Behavior (live, test-campaign, 2026-09-04, EvasiveFighter lv18 Battle Master, picker=["Riposte"])
1. TRIGGER UNENFORCED — arm-then-row model: `processManeuvers.js:49-70` builds the row from picker selection; `CharReactions.jsx:243` → `executeReactionManeuver` (executeActionManeuvers.js:333) rolls + expends die UNGATED vs `resolveTarget` (NOT `lastAttack.attackerName`). `pendingCombatSuperiorityPrompt` is written only by the ATTACKER's own attack (`attackPostProcessing.js:95`); defender misses trigger nothing; `CombatSuperiorityModal.jsx:114` melee_attack_miss radio filter is dead code (selectionMode always true since known≠all).
2. NO REACTION SPEND — zero reaction tracker keys; row re-fired a SECOND riposte in the same round (gates are only pool + Relentless latch).
3. MISS EXPENDS + LEAKS — a miss riposte still expended the die and left `pendingRiposteDieValue=2` armed (miss never runs damage pipeline); stale die rode the next hit.
4. NO `ability_use` LOG — `executeReactionManeuver` builds logEntries; `CharReactions.jsx:231-249` never flushes them (same drop as MN-013 Parry / CLA-228). Only roll/hp_change land.
5. CORRECT halves (for the record): first hit `1d6+0 + d(4/12) [piercing]` added ONCE (consumed via attackRollDamageCalc.js:231 `consume('pendingRiposteDieValue')`, no double-add); paid pool spend exact (6→5→…→0); pool-0 gate popup exact; Thug HIT produced no offer (absence-of-prompt only — manual row still fires).

## Steps to Reproduce
1. test-campaign → EvasiveFighter (lv18 Battle Master, picker Riposte; Short Rest to refill pool).
2. EB Thug Join Encounter; Thug attacks EF (hit or miss — irrelevant).
3. Click "Riposte:" row on EF's OWN turn, or immediately after a HIT — attack rolls and expends die.
4. Click row twice same round — second attack fires (no reaction gate).
5. Riposte-miss → pool down, `pendingRiposteDieValue` stays armed; next hit adds the stale die.

## Likely Location
- `src/hooks/combat/processManeuvers.js:49-70` (row build — no lastAttack.miss/attacker gate)
- `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js:333` (`executeReactionManeuver` — ungated roll/expend, target = resolveTarget not lastAttack.attackerName, no reaction flag, miss-path doesn't clear pending die)
- `src/components/char-sheet/CharReactions.jsx:231-249` (logEntries drop)
- `src/components/char-sheet/modals/CombatSuperiorityModal.jsx:114` (dead miss-filter)
- Manifest handler/router/infoBuilder paths stale (no maneuverHandler.js).

## Notes (design options)
- A: proper defender prompt — on defender-side melee miss (attackPostProcessing), if defender has Riposte selected + reaction available → write `pendingCombatSuperiorityPrompt` modal (RecklessAttackModal-style); accept → attack vs `lastAttack.attackerName`, spend reaction + die; miss → refund/clear pending die.
- B (minimal): keep arm-then-row but gate row click on `campaign.lastAttack {targetName==holder, hit==false, range≤5ft melee}` + stamp a once-per-turn/reaction flag + clear pending die on miss + flush logEntries.

## Cleanup state
Change-data + log cleared; pool refilled (Short Rest); picker re-armed ["Riposte"]; Battle Master lv18 Shortsword+Shield LEFT permanent.
