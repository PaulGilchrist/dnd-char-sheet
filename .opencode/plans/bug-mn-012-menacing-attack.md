# Bug MN-012 — Menacing Attack rider: superiority die never lands in damage (MN-009 crash reproduces)

## Overview
Verified live via Playwright (http://localhost:5173, campaign `test-campaign`, 2024 ruleset, 2026-08-30). GoliathFireGiant (Battle Master lv5, 4×d8 Superiority Dice) hit Animated Rug of Smothering 1 (AC 12, HP 27, WIS −4) twice; each time selected **Menacing Attack** in the "Battle Master — Attack Rider Maneuver" modal (`AttackRiderManeuverPrompt.jsx`) and clicked **Use Maneuver**.

The save half of the automation works end-to-end: die spent, WIS save prompt at the correct DC 10 issued, Frightened applied on the failed save with correct metadata. But the damage half is dead: the superiority die is NEVER added to any applied damage roll — zero damage from both hits (base weapon damage included), zero `hp_change`/damage log entries, no `Menacing Attack` `ability_use` log — and every **Use Maneuver** click throws the MN-009 `TypeError: currentRolls is not iterable` (reproduced twice, deterministically). Same bucket family as `bug-mn-009-goading-attack.md` and `bug-mn-011-maneuvering-attack.md`.

## Expected (2024 PHB + `public/data/2024/maneuvers.json`)
`{actionType: attack_rider, trigger: weapon_attack_hit, saveType: WIS, effect: frightened, damageBonus: true, dieExpression: superiority_die, duration: until_end_of_next_turn}`.
On hit + maneuver use: expend 1 Superiority Die; add the rolled die to THAT attack's damage roll (log formula = weapon dice + mod + superiority die, HP drops accordingly); target makes WIS save vs DC 8 + PB + max(STR,DEX) mod = **DC 10** (8 + 3 + −1); on fail → Frightened until end of the fighter's next turn; on success → nothing.

## Actual
Per use of the maneuver (two uses tested):
1. **Die spend — WORKS.** change-data `GoliathFireGiant.superiorityDice` 4→3 after use 1, 3→2 after use 2 (exactly one per hit; no Relentless at lv5).
2. **WIS save — WORKS.** `.sp-overlay` "Saving Throw Required — Animated Rug of Smothering 1 … DC 10" + log `save_result` entries:
   - use 1: "failed WIS save (DC 10, rolled 5 +-4 = 1)" ✓ DC matches expected 8+3+−1.
   - use 2: "succeeded WIS save (DC 10, rolled 16 +-4 = 12)" → no new application (pendingExpirations stayed at 1 entry from use 1).
3. **Frightened on fail — APPLIES (with wrong duration persistence).** Top-level change-data key `"Animated Rug of Smothering 1".activeConditions = ["frightened"]` + `activeConditionMeta.frightened {dc:10, ability:'WIS'}` + caster `pendingExpirations` `{type:'condition', condition:'frightened', appliedRound:1, expiryRounds:2}` — the until_end_of_next_turn (2-round) intent is in the metadata. **But duration is unenforced**: walked turns past the fighter's own turn (active: …→GlobeWizard→GoliathFireGiant→HeroesFeastBard) and `frightened` never cleared (residual-flag family, cf. bug-cla-175/191/194).
4. **Die-in-damage — FAIL (the core defect).** Rug `currentHp` **27 → 27 across both hits** (both HIT 14 vs AC 12). The campaign log contains only `roll attack` entries (`d20 12 +2`) — NO damage roll, NO `hp_change`, no `Menacing Attack` `ability_use` entry, no "Added N to the damage roll" text anywhere. No damage popup ever rendered after Done. Base weapon damage is lost too (not just the rider die).
5. **MN-009 crash — REPRODUCES DETERMINISTICALLY** on every **Use Maneuver** click (live console, twice — 331 s and 625 s into session):
   ```
   TypeError: currentRolls is not iterable
       at handleAttackRiderManeuverUse (src/components/char-sheet/useAttackDamageResolution.js:292:26)
       at async handleUse (src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx:13:15)
   ```
   The throw occurs AFTER `executeAttackRiderManeuverService` resolves (die spend + save + frightened), so the save half survives the crash while the damageBonus branch (`updatedFormula += ' + N [type]'` at :353-359) — whose returned formula is consumed by nobody anyway — never executes or applies.

## Steps to Reproduce
1. test-campaign → open **GoliathFireGiant** sheet (2024 Fighter/Battle Master lv5; Superiority Dice 4/4 d8).
2. Special Actions **"Combat Superiority:"** → picker → tick **Menacing Attack** → **Confirm Selection** (writes `BattleMasterManeuvers_selection`).
3. Encounters → search **Animated Rug of Smothering** → tick → **Join Encounter**. Initiative view → set GoliathFireGiant card **Target = Animated Rug of Smothering 1**.
4. Sheet → Actions row **Unarmed Strike "+2"** dice cell → auto-rolls (AC 12; re-roll on miss, dismissing popup between attempts).
5. On HIT popup → **Done** → modal "Battle Master — Attack Rider Maneuver" → tick **Menacing Attack** → **Use Maneuver**.
6. Observe console TypeError; WIS save prompt DC 10 → **Roll Save** → **Done** → **Skip**.
7. Check log + Rug HP card / change-data: HP unchanged (zero damage), no maneuver/damage log entries. Walk `Next →` past GoliathFireGiant's own turn: `frightened` still present (never expires).

## Likely Location
- `src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx:12` — `onUse(selectedManeuver, attack, popupHtml)` passes 3 args; `handleAttackRiderManeuverUse` (`useAttackDamageResolution.js:294`) destructures 6 and unconditionally spreads `currentRolls` at **:306** → TypeError (identical to MN-009 bug file; current line offsets shifted, `:292` in served stack).
- `src/components/char-sheet/useAttackDamageResolution.js:240-278` `applyPauseState` / `:285` `resumeAttackPipeline` — still no `attackRiderManeuver` resume branch; the returned `{formula,total,rolls}` (with the die added at :353-359) has no consumer that rolls/applies damage → base + rider damage both lost (CLA-188 / MN-011 damage-loss family).
- `src/services/automation/handlers/class-fighter-rogue/executeAttackRider.js:187-205` — the `damageBonus` branch only appends " Added N to the damage roll." to popup/log text; it never calls `applyDamageToTarget` for the rider die, unlike the Brutal Strike options branch (:78-85) which does apply. Even with the crash fixed on the pipeline path, this pending-prompt path would still log damage it never dealt.
- Expiration: `combatSuperiorityUtils.js:140-142` correctly enqueues `addExpiration(… frightened …, 2)` but no turn-end consumer cleared it when the fighter's turn passed (`expireOnCreatureName:null`; cf. residual-flag family).

## Notes
- Save DC computed correctly: **DC 10 = 8 + PB(+3) + STR/DEX mod(−1)** — both prompt and log agree; ground truth from `public/data/2024/maneuvers.json` + character JSON (abilities all 8 except INT/WIS/CHA 9).
- Save-success branch verified clean: use 2 succeeded → no new condition application, no new expiration entry, no extra die spend beyond the (wasted) use.
- The die IS spent even though its damage benefit is lost — player loses 1/4 of their resource per broken use (same double-fault as MN-009).
- CLA-186's "rider modal worked" observation did NOT hold in this run; MN-009's crash is reproducible (2/2 uses).
- Runtime/log cleaned after run (rug removed, Admin Clear Change Data + Clear Campaign Log).
