# Bug MN-011 — Maneuvering Attack (Battle Master attack rider)

## Overview
MN-011 Maneuvering Attack (2024 `public/data/2024/maneuvers.json`, `actionType: attack_rider`, `trigger: weapon_attack_hit`, `effect: ally_movement`, `damageBonus: true`, `dieExpression: superiority_die`) was verified E2E on GoliathFireGiant (Battle Master lv5, d8 superiority dice 4/4) vs EB-joined Animated Rug of Smothering 1 (AC 12, HP 27) in test-campaign, 2026-08-30.

The maneuver is selectable and **consumes the Superiority Die correctly**, but the run FAILS on both remaining legs: (b) the superiority die is **never actually added to an applied damage roll** (target HP never changed across two separate hits, one a natural 20 crit), and (c) **no ally reaction-movement grant exists anywhere in the codebase** — the ally pick is pure prose in a popup. The pipeline rider surface additionally crashes with the MN-009 `currentRolls is not iterable` TypeError.

## Expected
On a weapon attack hit: expend 1 Superiority Die; add the rolled die to the attack's damage roll; choose a willing creature who can see/hear you; that creature may use its Reaction to move up to half its Speed without provoking Opportunity Attacks from the attack's target.

## Actual
1. **Die spend — WORKS.** Special Actions "Combat Superiority:" → "Select Maneuvers" picker → tick Maneuvering Attack → Confirm Selection writes runtime `GoliathFireGiant.BattleMasterManeuvers_selection = ["Maneuvering Attack"]`. On first hit, the Combat Superiority "Use Maneuver" surface consumed `superiorityDice 4→3` (change-data confirmed) and logged `ability_use "Maneuvering Attack: Rolled d8 for 6 … Added 6 to the damage roll."`.
2. **Die-in-damage — FAIL.** Animated Rug `currentHp` stayed **27 → 27** across all attacks, including a **nat-20 CRITICAL HIT** ("CRITICAL HIT! — DAMAGE DICE DOUBLED / ✓ HIT (22 vs AC 12)") where at least `2d4-2` base weapon damage plus the d8 rider should have landed. The campaign log contains **zero `hp_change` entries** and **no damage popup ever rendered** after clicking Done on any hit popup — the "Added 6 to the damage roll" text is cosmetic popup prose only (CLA-188 damage-loss family: the pipeline pauses on the rider modal (`actionPipeline.js:46-61` stores `_pausedStep`/`_modalType`) and `resolveAttackDamage`'s pause handler (`useAttackDamageResolution.js:234-269`) has **no `attackRiderManeuver` resume branch**, so neither base nor rider damage is applied).
3. **Rider prompt crash — FAIL.** After clicking Done on the second HIT, the pipeline modal "Battle Master — Attack Rider Maneuver" (`AttackRiderManeuverPrompt.jsx`) rendered; selecting Maneuvering Attack and clicking **Use Maneuver** threw, live console:
   `TypeError: currentRolls is not iterable at handleAttackRiderManeuverUse (useAttackDamageResolution.js:273) at async handleUse (AttackRiderManeuverPrompt.jsx:13)` — this is the **MN-009 crash reproducing deterministically** (30s re-test, not intermittent). `onUse(selectedManeuver, attack, popupHtml)` passes 3 args while `handleAttackRiderManeuverUse(maneuver, attack, popupHtmlData, currentFormula, currentTotal, currentRolls)` spreads `currentRolls` (line 282). It still spent a second die (3→2) via `executeAttackRiderManeuverService` before the throw — die consumed, zero damage, no grant.
4. **Ally reaction grant — FAIL (unimplemented).** Two 30-ft-away willing allies in the encounter (e.g. HeroesFeastBard, next in initiative after the fighter) received nothing: no ally-select modal ever appears (rider prompt has only a maneuver radio list), and grep shows `effect === 'ally_movement'` has **no consumer** anywhere — only description-string appends (`executeAttackRider.js:141-143`, `executeManeuver.js:101-103`, `attackRiderHandler.js:422,649`). No targetEffect, no `no_OA` flag, no expiration, no log names a chosen ally. Contrast the working CLA-199 pattern (`reactionBonusHandler.js` writes `inspiringMovementGranted`/`inspiringMovementNoOA` + expirations).

## Steps to Reproduce
1. test-campaign → open GoliathFireGiant sheet → Special Actions **"Combat Superiority:"** → picker → tick **Maneuvering Attack** → **Confirm Selection** → navigate away/back (remount).
2. Encounters → Encounter Builder → tick **Animated Rug of Smothering** → **Join Encounter**.
3. Initiative → walk `Next →` to GoliathFireGiant; set fighter card **Target = Animated Rug of Smothering 1**.
4. Sheet → Actions row **Unarmed Strike "+2"** dice cell → auto-rolls. On MISS a "Combat Superiority — Use Maneuver" prompt appears — Cancel, click popup to dismiss, re-roll until HIT (AC 12, +2 to-hit; several attempts needed).
5. On HIT: click popup **Done**.
   - Path A (pre-Done pending prompt, header "Combat Superiority — Use Maneuver"): tick Maneuvering Attack radio → **Use Maneuver** → popup "Rolled d8 for N … Added N to the damage roll" → dismiss. Rug HP **unchanged**, no damage popup, no hp_change log.
   - Path B (post-Done pipeline modal, header "Battle Master — Attack Rider Maneuver"): tick radio → **Use Maneuver** → console error `TypeError: currentRolls is not iterable`, second die spent, **no effect at all**.
6. Check any ally (HeroesFeastBard etc.): no reaction badge, no granted-movement flag in change-data — the grant does not exist.

## Likely Location (real impl paths found)
- **`src/components/char-sheet/useAttackDamageResolution.js`**:
  - **:273-282** `handleAttackRiderManeuverUse` — MN-009 crash: called with 3 args from `AttackRiderManeuverPrompt.jsx:12` but destructures `currentFormula/currentTotal/currentRolls`; `[...currentRolls]` throws. Its damageBonus branch (:331-338) would re-roll a *second* d8 (disagreeing with the die already rolled by the service) and returns an updated formula that **no caller consumes** — no `proceedWithDamage`/`rollDamage` after the modal.
  - **:234-269** pause handler covers `damageTypeChoice`/`divineFury`/`secondaryTarget`/`tacticalMaster`/`shieldBash` but **not `_modalType === 'attackRiderManeuver'`** → pipeline paused at `attackRollRiders.js` `buildAttackRiderManeuversStep` (:28-33) never resumes, so all attack damage (base + rider) is lost — CLA-188 family.
- `src/components/char-sheet/modals/AttackRiderManeuverPrompt.jsx:12` — `onUse` call arity mismatch; also never prompts for the willing ally.
- `src/services/automation/handlers/class-fighter-rogue/executeAttackRider.js:141` + `executeManeuver.js:101` — `ally_movement` is prose-only; **no targetEffect/reaction-grant write**. A fix should mirror the CLA-199 recipe in `reactionBonusHandler.js` (granted + noOA flags on the chosen ally + `addExpiration`) and route the chosen rider die value into the paused-damage resume.

## Notes
- Superiority die spend itself is correct (4→3→2 in change-data; die roll shown in popup; once per hit).
- `handleSuperiorityBonuses.js` only consumes `feintingAttackDieValue`/`commanderStrikeBonus`/`lungingAttackDieValue` — there is **no maneuvering-attack die consumer**, so even a working resume wouldn't add the die without new plumbing.
- The first miss also surfaced the pending-prompt rider modal offering an **on-hit** maneuver — filter by hit/miss context there too.
- Miss-flow noise only; CLA-186's earlier "rider modal worked" note does not reproduce: both surfaces now lose damage.
- Runtime cleared after run: Rug removed from initiative, Admin Clear Change Data + Clear Campaign Log.
