# SP-099 Resistance — once-per-turn benefit only re-arms at target's own turn start (effectively once per round)

## Overview
2024 cantrip Resistance (Cleric/Druid) is fully implemented end-to-end: two-stage gate (target picker → damage-type picker), targetEffect write, 1d4 reduction on first chosen-type damage, popup line, and `ability_use` log all work EXACTLY. However, the "only once per turn" clause is implemented backwards-strict: the `resistanceUsedThisTurn` flag on the target is cleared ONLY at the start of the TARGET's own turn (`turnStartEffects.js:180-184`, keyed on `activeName`), not at every turn boundary. RAW: a creature can benefit once PER TURN — i.e. the benefit re-arms at the start of EVERY creature's turn, so multiple attackers hitting the protected target on different turns in the same round should EACH be reduced by 1d4. Live probe proves a second attacker's chosen-type hit in the same round gets ZERO reduction.

## Expected Behavior (canonical app-data wording, `public/data/2024/spells.json` index `resistance`)
> "You touch a willing creature and choose a damage type: Acid, Bludgeoning, Cold, Fire, Lightning, Necrotic, Piercing, Poison, Radiant, Slashing, or Thunder. When the creature takes damage of the chosen type before the spell ends, the creature reduces the total damage taken by 1d4. A creature can benefit from this spell only once per turn."

"Once per turn" = once during each turn in the turn cycle (standard RAW reading of this wording family, cf. Guidance Sage Advice). The reduction must be available again on the next creature's turn.

## Actual Behavior
- First chosen-type instance on the caster's self-cast target: reduced EXACTLY (popup "-1d4 [Resistance]: -2", 6 → 4, hp_change −4, ability_use log). ✓
- Second chosen-type instance same turn: full damage (correct gate). ✓
- Non-chosen type (Piercing control): full damage, no popup line (correct gate). ✓
- **BUG:** chosen-type damage on a DIFFERENT creature's turn, same round, before the target's own turn: NO reduction at all. Live: Thug 2's turn (init 6, active after Thug 1 init 7) — Mace crit 2d6+2 = 14 bludgeoning applied FULL (HP 102 → 88, hp_change −14, no `-1d4 [Resistance]` popup line, no `ability_use` Resistance log). `resistanceUsedThisTurn` remained `true` through Thug 2's turn start. RAW expects ~1d4 reduction there.

## Steps to Reproduce
1. localhost:5173 → test-campaign → Divine_Cleric (lv17, Resistance cantrip known via Edit-wizard Spells step checkbox + ✓Save inside `.character-creation-wizard-overlay`).
2. Encounters → search Thug → Select Thug → Join Encounter (×2 → Thug 1 init 7, Thug 2 init 6 auto-joins and becomes active).
3. Divine_Cleric sheet → Spells row "Resistance" → popup "Cast Spell" → target picker select Divine_Cleric → "Cast Resistance" → type picker Bludgeoning → `.sp-roll-btn` "Choose Damage Type".
4. Thug 1 card → Target=Divine_Cleric → avatar `.mc-overlay` → Mace `+4` → HIT → Done → popup shows `-1d4 [Resistance]: -N` (first hit reduced ✓). Click Mace again same turn → full damage (gate ✓).
5. Thug 2 (active turn, same round) → card Target=Divine_Cleric → avatar → Mace → HIT → popup shows FULL damage, NO Resistance line (BUG; RAW reduced by 1d4).

## Likely Location
- **Stale manifest paths:** `src/services/combat/automation/handlers/spellHandler.js` / `routers/spellRouter.js` / `infoBuilders/spellInfoBuilder.js` do NOT exist. Real chain:
  - Gate: `src/hooks/combat/spellGates.js:418` (`gateResistance`, key `'resistance'` :690) → `TargetSpellPopups.jsx:555-576`
  - Apply: `src/hooks/combat/useSpellMetamagicFlow/useTwoStageHandlers.js:40` → `src/services/automation/handlers/buffs/resistanceHandler.js` (`applyResistance`, stamps `resistanceUsedThisTurn=false`, te `resistance_damage_reduction` {chosenType})
  - Consumer: `src/hooks/combat/handlers/handlePlainDamage.js:65-83` (type match + not-used → roll 1d4, subtract, stamp used, log)
  - **Reset bug:** `src/services/rules/effects/turnStartEffects.js:180-184` clears `resistanceUsedThisTurn` only for `activeName` (the creature whose turn is starting) → a target hit by OTHER creatures never re-arms until its own turn. Fix direction: clear ALL creatures' `resistanceUsedThisTurn` at every turn start (or key the stamp by round+turn), per the "resistance_clear_turn" te hook at :157 which is written by nobody.
- Once-per-turn same-turn gate + type gate + popup (`DiceRollResult.jsx:263-265`) + logs (`LogRollEntry.jsx:130`) all correct.

## Notes
- Concentration: `applyResistance` calls `addConcentration(cs, caster, 'Resistance', 10)` — hardcoded DC 10 (known SP-097 spellPreparationService family quirk); concentration record location not surfaced at combatSummary top level during test.
- Live control probes: same-turn 2nd bludgeoning NOT reduced (correct); non-chosen Piercing NOT reduced (correct); different-turn bludgeoning NOT reduced (WRONG — decisive delta vs RAW).
- Damage math evidence: hit1 crit 1d6*2+2=6, reduced 2 → 4 (hp 122→118); hit2 mace 1d6+2=8 full (118→110); crossbow crit 1d10*2=8 full (110→102); Thug2 crit 1d6*2+2=14 full (102→88, RAW expected 14−1d4).
