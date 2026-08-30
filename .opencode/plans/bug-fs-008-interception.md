# Bug FS-008 — Interception (fighting style reaction): disadvantage never applied, reaction never consumed

## Overview
Interception (FS-008) surfaces correctly as a manual-click reaction on the fighter sheet and its damage-reduction popup math (`1d10 + PB`) is exact, but two mandated behaviors are broken: (1) Disadvantage is never imposed on any attack roll — the `protection` targetEffect is written under the WRONG runtime key (per-character instead of campaign), which the runtime store itself rejects with console ERRORS, and (2) the reaction is not consumed — it can be re-clicked unlimited times against the same trigger, healing the ally multiple times.

## Expected
When a visible creature attacks an ally other than the fighter within 5 ft (shield/weapon held): reaction imposes Disadvantage on the attack roll (re-roll/second d20 or forward disadvantage consumed by the attacker's next attack) AND reduces damage by 1d10 + PB (exact). Reaction consumed once per trigger (once per round).

## Actual
1. **No disadvantage, ever.** No re-roll of the triggering attack (unlike Warding Flare / `reactionDebuffHandler` which rolls a second d20). The handler writes `{effect:'protection', target:'HexWarlock'}` via `setRuntimeValue(playerName, 'targetEffects', …)` under key `"EvasiveFighter".targetEffects`, but every consumer (`MonsterCardModal.jsx:62` `useRuntimeValue('campaign','targetEffects')` → `conditionEffects.js:345` targetDisadvantageCount) reads **campaign-level** targetEffects. Runtime store logs hard errors both directions:
   `[getRuntimeValue] Campaign-level key read with wrong characterKey. Key: "targetEffects", characterKey: "EvasiveFighter"… Should use characterKey = "campaign"` (and matching `[setRuntimeValue]` error; raised at CharReactions.jsx:218 dispatch path).
   Proof: Wight attacked HexWarlock again while the protection te was live → popup showed a SINGLE d20 (`d20 14 +4 = 18 vs AC 9 HIT`), no two-dice disadvantage mode.
2. **Reaction never consumed.** Four consecutive Interception clicks (two distinct hits + re-clicks on the same lastAttack) all fired: `1d10(5)+6=11`, `1d10(4)+6=10`, `1d10(2)+6=8`, `1d10(6)+6=12` — HexWarlock healed twice for the SAME trigger (HP 55 → 59 → 63). No uses tracker key exists, no cannotAct gate, no per-round guard.
3. Secondary precision issue: reduction heals only the RECORDED original damage (4) while the attack actually dealt 8 (secondary necrotic 4 under-recorded in `lastAttack.actualDamage` — CLA-180 family).

## Steps to Reproduce
1. test-campaign; EvasiveFighter granted fightingStyles `["Interception"]` (Edit wizard step 12), equipped `["Shortsword","Shield"]` (JSON ground truth); PB +6.
2. EB-join Wight; set Wight card Target = HexWarlock (AC 9).
3. Wight `.mc-overlay` → `.mc-dice-link` idx 9 "+4" → HIT → Done (ally takes damage).
4. EvasiveFighter sheet → Reactions → click "Interception:" → popup shows exact `1d10(X) + 6` reduction + heal.
5. Click "Interception:" again → re-fires, heals again (no consumption).
6. Wight attacks HexWarlock again → single d20, no disadvantage despite live protection te. Console shows wrong-key errors.

## Likely Location
- `src/services/automation/handlers/reactions/interceptionHandler.js:54-70` — should write `setRuntimeValue('campaign', 'targetEffects', …)` (or the handler should re-roll the triggering attack with disadvantage like `reactionDebuffHandler.js` does for Warding Flare).
- Same file: no reaction-consumption/resource tracking (compare `wardingflareUses` pattern in `reactionDebuffHandler.js` / `_trackedResources`).
- `src/components/char-sheet/CharReactions.jsx:218-227` dispatch path propagates the character-scoped key.

## Notes
- Grant path, routing (`automationRouter.js:402`), infoBuilder (`reaction.js:250`, damageBonus=PB), shield-or-weapon gate (2024 feats.json `requiresShieldOrWeapon`), 5-ft/no-map skip, popup rollup, and ability_use logs all work.
- Manifest handler/router/infoBuilder paths (src/services/combat/automation/…) don't exist; real chain documented in checkpoint-fs-008-interception.md.
