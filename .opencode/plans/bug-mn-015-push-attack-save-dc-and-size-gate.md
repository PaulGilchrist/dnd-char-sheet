# Bug MN-015 — Pushing Attack: STR save DC uses fallback 10 (not 8+STR+PB) and size gate not enforced on Encounter-Builder monsters

## Overview
MN-015 Pushing Attack (2024 Battle Master attack-rider maneuver, Fighter lv5+) rides a
weapon hit on a weapon/Unarmed Strike. The trigger, superiority-die expend, die-added-to-damage,
STR save prompt, "pushed N feet" log on a failed save, and "no push" on a successful save all fire
live. However the automation has two confirmed defects that make it non-rule-exact:

1. **Wrong STR save DC.** The save prompt is built at the hardcoded fallback **DC 10** instead of
   the correct Battle Master maneuver DC **8 + STR + PB = 8 + 0 + 6 = 14** for the test character.
   `savePrompt.js` emits its known fallback console error. (Same defect family as CLA-277 Quivering
   Palm and SP-045 Fear.)
2. **Size gate not enforced.** Pushing Attack is `sizeLimit: large_or_smaller` ("If the target is
   Large or smaller…"). A **Huge** Hill Giant was accepted and given a STR save instead of being
   refused, because the size check reads a `size` field that Encounter-Builder combatSummary entries
   never carry (defaults to `'Medium'`).

## Expected Behavior (canonical wording)
`public/data/2024/maneuvers.json` → "Pushing Attack":
> "When you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can expend
> one Superiority Die to attempt to push the target. Add the Superiority Die to the attack's damage
> roll. **If the target is Large or smaller**, it must succeed on a **Strength saving throw** or be
> pushed up to 15 feet directly away from you."
Data: `{ saveType: "STR", saveAbility: "STR", effect: "push", value: 15, damageBonus: true,
sizeLimit: "large_or_smaller", dieExpression: "superiority_die" }`.

`public/data/2024/classes.json` → Fighter → Battle Master → Combat Superiority automation:
`{ type: "combat_superiority", saveType: "WIS", saveAbility: ["STR","DEX"], saveDc: "ability", … }`
and feature text "Saving Throw DC = 8 + Strength/Dexterity modifier + Proficiency Bonus."
EvasiveFighter lv18: STR total 10 (+0), PB +6 → correct maneuver save DC = **14**.

## Actual Behavior
- STR save prompt text: `Saving Throw Required — <target> must make a STR saving throw. DC 10`
  (both targets). Save log: `Gibbering Mouther 1 failed STR save (DC 10, rolled 3 = 3)` and
  `Hill Giant 1 succeeded STR save (DC 10, rolled 6 +5 = 11)` — DC shown is **10**, not **14**.
  Note: the Hill Giant's roll (11) would FAIL the correct DC 14 but SUCCEEDS the fallback DC 10,
  so the bug flipped a real combat outcome.
- Console (every trigger):
  `[buildSaveDc] Spell "unknown" has no saveDc defined. Expected 'spell_save_dc', 'ability', or a number.`
  (savePrompt.js:26 → returns 10).
- Huge Hill Giant (a size gate refusal case) was NOT refused: it received the STR save. The
  "too large" refusal popup never appeared.

## What works (verified live)
- Trigger fires post-hit: "Battle Master — Attack Rider Maneuver" modal lists "Pushing Attack —
  adds superiority die to damage — STR save" (requires non-empty runtime
  `BattleMasterManeuvers_selection`; picked via Combat Superiority picker).
- Superiority die added to damage: second maneuver logged `Pushing Attack: Rolled d12 for 6. Added
  6 to the damage roll.` and runtime `attackRiderDieValue` consumed into the damage formula
  (`1d6+0 [piercing] + N [piercing]`, e.g. `+ 9`).
- Die counter decrement on the expend path: `superiorityDice` moved from the runtime default to 3
  (6 displayed max). First maneuver in a round used **Relentless** (free d12, `…for 9 (Relentless)`,
  no expend) — by design, so the counter did NOT move on the first use; the expend path is the
  second same-round use.
- Push represented as a LOG entry only: `EvasiveFighter pushed Gibbering Mouther 1 15 feet away.`
  (`ability_use`). No `targetEffects`/position written for push (consistent with the instant-push
  precedent at `openHandTechniqueHandler.js:155` "Push effects are instant — just log, no
  targetEffect"; the te `effect:'push'` consumer at `conditionEffects.js:363` is only fed by
  Shield Bash/Tavern Brawler, never by Pushing Attack).
- On save success (Hill Giant) → no push log entry produced (correct branch).

## Steps to Reproduce
1. EvasiveFighter (2024 Human Fighter lv18). Edit wizard → step 6 pick another class then re-pick
   Fighter (pitfall 12, clears stale `class.major`) → step 7 Subclass = Battle Master → Save.
   Verify JSON `class.subclass.name = "Battle Master"`, `class.major = null`.
2. Short Rest to refill superiority dice (runtime `superiorityDice` was 0).
3. Sheet → click "Combat Superiority:" → tick "Pushing Attack" → Confirm Selection
   (writes runtime `BattleMasterManeuvers_selection = ["Pushing Attack"]`).
4. Encounter Builder → tick "Gibbering Mouther" (Medium, STR save +0) → Join Encounter.
5. Initiative → EvasiveFighter card Target dropdown = "Gibbering Mouther 1".
6. EvasiveFighter sheet → click Shortsword "+6" hit link → auto-rolls HIT → Done.
7. Rider modal → select "Pushing Attack" → "Use Maneuver".
8. STR save prompt appears — observe **DC 10** (expected 14); console logs the buildSaveDc error.
9. (Size gate) Repeat against "Hill Giant 1" (Huge): the maneuver is still offered and a STR save
   is prompted instead of a "too large / Large or smaller" refusal.

## Likely Location
- `src/components/char-sheet/useAttackDamageResolution.js:301-309` `handleAttackRiderManeuverUse`
  builds `const action = { automation: {} };` and calls
  `executeAttackRiderManeuver(action, …)`. The combat_superiority feature automation
  (`saveDc:'ability'`, `saveAbility:['STR','DEX']`) is never attached, so DC info is lost.
- `src/services/automation/handlers/class-fighter-rogue/executeAttackRider.js:131-137` —
  `const saveDc = buildSaveDc(auto, playerStats);` with `auto = action.automation` (`{}`).
- `src/services/automation/common/savePrompt.js:7-27` `buildSaveDc` — empty `auto.saveDc` hits the
  fallback branch (`return 10` + console.error). Fix pattern: forward `saveDc:'ability'` +
  STR/DEX `saveAbility` (or a numeric DC) into the rider `action.automation`, matching the CLA-277
  fix shape.
- Size gate: `src/services/automation/handlers/class-fighter-rogue/executeManeuver.js:374`
  `validateSizeLimit` reads `target.size` from the combatSummary creature;
  `src/services/encounters/encounterToInitiative.js` writes NO `size` key on EB creatures, so
  `sizeOrder.indexOf(target.size || 'Medium')` defaults every EB monster to Medium and
  `large_or_smaller` never rejects a Huge/Gargantuan target.

## Notes
- Manifest paths in the task are stale. Real chain: pipeline step
  `src/services/combat/steps/attackRollRiders.js` → `AttackRiderManeuverPrompt.jsx` →
  `useAttackDamageResolution.js handleAttackRiderManeuverUse` →
  `executeAttackRider.js executeAttackRiderManeuver` → `combatSuperiorityUtils.js
  processManeuverSaveResult` (push = log only). There is no
  `src/services/combat/automation/{handlers,routers,infoBuilders}/maneuver*` file.
- Secondary unrelated console noise during the same attacks: `_Vex_appliedTarget` written to a
  campaign-level key with the wrong `characterKey` (Shortsword Vex mastery) — out of MN-015 scope.
- DC genuinely is 14 (STR +0, PB +6), so DC 10 is NOT a legitimate value here → decisive FAIL.

## Registry / state left behind
- EvasiveFighter PERMANENTLY converted: subclass Psi Warrior → **Battle Master** (lv18, major null,
  feats unchanged GWM/Mage Slayer/Savage Attacker). Runtime change-data + campaign log cleared.
  Gibbering Mouther + Hill Giant removed.
