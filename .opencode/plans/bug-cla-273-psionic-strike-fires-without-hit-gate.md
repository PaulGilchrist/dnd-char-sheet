# Bug — CLA-273 Psionic Strike fires without any hit (no trigger gate; auto-chains lv7 Thrust save)

## Overview
CLA-273 Psionic Strike (Fighter → Psi Warrior lv3, 2024) is implemented and mechanically exact for the damage half (d12 roll + INT mod, Force, pool consume, once-per-turn latch, logs), BUT the trigger is not enforced at all. The feature surfaces ONLY as an always-visible clickable row in the character sheet Reactions section — visible even before any combat exists — and the handler never checks that the character hit and dealt damage with a weapon. Live-proven on 2026-09-02: clicking it immediately after a clear MISS (d20 3 +6 = 9 vs AC 14) still expended 1 Psionic Energy Die (pool 11→10) and dealt 12 Force damage (d12 10 + INT 2) to Wight 1 (HP 58→46).

## Expected Behavior (canonical app-data wording, public/data/2024/classes.json Fighter → majors[3] Psi Warrior → features[0], lv3)
> "Psionic Strike. You can propel your weapons with psionic force. Once on each of your turns, immediately after you hit a target within 30 feet of yourself with an attack and deal damage to it with a weapon, you can expend one Psionic Energy Die, rolling it and dealing Force damage to the target equal to the number rolled plus your Intelligence modifier."

Automation metadata is correct in the data: `{type:'psionic_strike', resource:'psionicEnergy', damageExpression:'psionic_energy_die + INT modifier', damageType:'Force', oncePerTurn:true, casting_time:'1 reaction'}`. No saving throw is offered by Psionic Strike itself.

## Actual Behavior
1. **Option is never gated on a hit.** `automationRouter.js:106` routes `psionic_strike` into `reactions`; `CharReactions.jsx:703` renders it as an always-clickable row — observed on the sheet with NO combat staged and before any attack was ever made. There is no post-hit popup, no reaction arming, no lastAttack check.
2. **Handler fires on miss / no attack at all.** `psionicStrikeHandler.js` never reads `campaign.lastAttack` or any hit state — it only requires an initiative-card Target (`getTargetFromAttacker` :49). Post-miss probe: pool 12/12→11→10 across two uses; miss-triggered use consumed a die, dealt d12(10)+INT(+2)=12 Force (change-data `Wight 1.currentHp 58→46`), logged `ability_use` + `roll rollType:damage` (`rolls:[10,2], formula "12 + 2", damageType "Force"`).
3. **Un-requested auto-chain:** every Psionic Strike roll (including the miss-triggered one) auto-opens the lv7 Telekinetic Adept STR save `.sp-overlay` (DC 16 = 8+INT2+PB6) and applies Prone on fail (`psionicStrikeHandler.js:82-130`) — Thrust should only trigger "when you deal damage" (never happened on the miss click's weapon attack) and its own once-per-Short-Rest use is not tracked/consumed.
4. **Once-per-turn latch is sentinel-based:** production never writes the `currentTurn` runtime key (grep: only reads in psionicStrikeHandler/HurlThroughHellModal + test mocks), so `psionicStrikeUsedThisTurn` is written `'unknown'` and any later click — even on a LATER turn (e.g. Action Surge second turn) — is falsely blocked until the round-wrap reset in `navigationHandlers.js:51`. Same-turn double-use IS correctly blocked ("Already used this turn. Once per turn.", pool unchanged 11/11→ stays 11).

What DOES work (verified live, EvasiveFighter Psi Warrior lv18, INT 15/+2, d12 ×12): pool Short-Rest init 0→12; hit-triggered click math exact — d12 roll 4 + INT 2 = 6 Force, Zombie 1 took it, pool 12→11 persisted in change-data, popup "Dealt 6 Force damage … Rolled 12 for 4 + INT 2 … Psionic Energy: 11/12", log `ability_use` + `roll rollType:damage rolls:[4,2]`; second same-turn click refused with no die spent; round-wrap re-arm works (flag null in round 2).

## Steps to Reproduce
1. http://localhost:5173 → "test-campaign" → EvasiveFighter (Psi Warrior lv18, INT 15/+2; Short Rest → Complete Short Rest if "Energy Dice:" shows 0/12).
2. Observe "Psionic Strike:" row in Reactions with no attack made. Encounter Builder → tick Zombie + Wight → Join Encounter.
3. Initiative: fighter card Target = Wight 1 (AC 14). Sheet → Shortsword "+6" → keep attacking until MISS (seen: d20 3 +6 = 9 vs AC 14).
4. Dismiss the miss popup → click "Psionic Strike:" → STR save prompt opens and popup confirms "Dealt 12 Force damage … Rolled 12 for 10 + INT 2. Psionic Energy: 10/12" — die spent + Force damage despite the miss.
5. Same-turn double-click after a use → "Already used this turn. Once per turn." (this gate works, via the 'unknown' sentinel).

## Likely Location
- `src/services/automation/handlers/class-sorcerer/psionicStrikeHandler.js:12-72` — handle() lacks any hit/lastAttack gate (compare reactionDebuffHandler/protectiveFieldHandler which latch onto lastAttack); `:82-130` auto-chains telekinetic_thrust save unconditionally (should require an actual hit-damage event + its own once-per-short-rest tracking).
- `src/components/char-sheet/CharReactions.jsx:703` + `src/services/combat/automation/automationRouter.js:106` — row is trigger-ungated (app-wide manual-reaction model, but Psionic Strike needs at least a lastAttack gate in the handler).
- `psionicStrikeHandler.js:34/:77` — `currentTurn` runtime key has NO production writer (CLA-109 argless-round family): gate degrades to once-per-round sentinel `'unknown'`; writer needed in `navigationHandlers.js` next-creature step (or key off combatSummary active creature + round).
- Minor: log/popup text "Rolled {dieSize} for {dieValue}" prints the die TYPE first ("Rolled 12 for 4") — misleading cosmetic wording.

## Notes
- Manifest paths stale again: real handler lives under `src/services/automation/handlers/class-sorcerer/` (same family as CLA-267 Protective Field which IS correctly lastAttack-latched — the latch pattern exists in this codebase, just not applied here).
- applyDamageToTarget at :72 is called WITHOUT await (CLA-192 family) — HP still lands because applyDamage logs/mutates internally, but never copy that call shape in fixes.
- Test char LEFT configured: EvasiveFighter = Psi Warrior lv18, INT baseScore 15 (+2) (permanent JSON change), Shortsword+Shield equipped; staged Wight 1 + Zombie 1 removed, change-data + campaign log cleared after run.
