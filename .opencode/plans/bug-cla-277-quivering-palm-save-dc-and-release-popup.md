# Bug — CLA-277 Quivering Palm (Monk, 2024)

## Canonical wording (from public/data/2024/classes.json, Monk → majors[3] "Warrior of the Open Hand" → features[3], level 17)
"When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. The vibrations are harmless unless you take an action to end them. Alternatively, when you take the Attack action on your turn, you can forgo one of the attacks to end the vibrations. To end them, you and the target must be on the same plane of existence. When you end them, the target must make a Constitution saving throw, taking 10d12 Force damage on a failed save or half as much damage on a successful one. You can have only one creature under the effect of this feature at a time. You can end the vibrations harmlessly (no action required)."

Automation metadata in data: `{type:'quivering_palm', casting_time:'passive', cost:{amount:4, resource:'focusPoints'}, trigger:'action', damageExpression:'10d12', damageType:'Force'}` — NO `saveDc` field.

## Title
CLA-277 Quivering Palm shockwave CON save uses fallback DC 10 instead of the Monk's Focus save DC (18), and the "Release the Harmless Vibrations" option renders a bogus "CON save Failure / damage" result popup

## Overview
Verified E2E on Disciplined_Monk (lv17 Warrior of the Open Hand, 2024, WIS 19/+4, PB +6, Focus Save DC 18) at http://localhost:5173, campaign "test-campaign", vs EB-joined Yuan-Ti Pureblood 1 (humanoid, AC 11, HP 40, CON +0) and Cultist Fanatic 1 (humanoid, AC 13, HP 44, CON +1).

The core machinery is live and mostly correct: hit-gated arming, exact 4 Focus Point cost, single-target campaign tracking, 10d12 Force shockwave with correct half-on-save math, harmless release state-clear + log, and refusals for "no prior attack by you" / "already active". TWO defects fail the strict PASS bar:

1. WRONG SAVE DC: `applyShockwave` calls `buildSaveDc(auto, playerStats)` (`quiveringPalmHandler.js:198`) but the data automation object has no `saveDc`, so `savePrompt.js:28` logs `[buildSaveDc] Spell "quivering_palm" has no saveDc defined` (console ERROR captured live) and returns the **fallback DC 10**. Expected: the Monk's Focus save DC **18** (8 + WIS 4 + PB 6 — same DC the sheet displays, CLA-241 precedent). The wrong DC FLIPPED the live save outcome: Yuan-Ti CON +0 rolled d20 16 → "SAVE SUCCESS — Total: 16 vs DC 10" (at DC 18 this is a FAILURE). Both the `.sp-overlay` prompt and the log entries carry `saveDc:10`.
2. HARMLESS-END POPUP WRONG: `applyRelease` returns an `automation_info` popup ("Vibrations released harmlessly against X.") but `QuiveringPalmModal.jsx` stores ANY result into its `result` state and renders the shockwave result template — the live harmless-release popup read "Quivering Palm — Cultist Fanatic 1 rolled a CON save (DC ): Failure. : (?) Full damage: damage." with empty fields, claiming a save + full damage that never happened. (State + log were still released correctly; the delivery popup is wrong.)

## Expected Behavior
- After the Monk hits a creature with an Unarmed Strike, clicking "Quivering Palm:" expends 4 Focus Points and marks that one creature (campaign `quivering_palm` + targetEffects).
- On a later turn, ending via shockwave forces a **CON saving throw vs the Monk's Focus save DC (DC 18 for this character)**, 10d12 Force full on fail / half on success.
- Ending harmlessly (no action required) shows a harmless-release confirmation — no save, no damage.
- Only one creature affected at a time; a second arming attempt while one is active must re-target the existing holder of the effect, not a new creature.

## Actual Behavior
- DC leg (FAIL): `.sp-overlay` prompt "Saving Throw Required — Yuan-Ti Pureblood 1 must make a CON saving throw. **DC 10**" → Roll Save → "SAVE SUCCESS Total: 16 vs DC 10 / d20 (16) + 0". Save-result log `{rollType:'save_result', saveDc:10, success:true, roll:16}`; save-damage logs `{saveDc:10, formula:'10d12', rolls:[3,9,12,10,7,12,10,5,3,11], total:82, finalDamage:41}`. Dice/half math exact; DC wrong. Monster HP 32 → 0 (`hp_change delta:-32 threshold:'dead'` — clamped from 41). Console error `[buildSaveDc] Spell "quivering_palm" has no saveDc defined ... savePrompt.js:26` fires on Trigger.
- Harmless-release leg (FAIL): popup text "Quivering Palm — Cultist Fanatic 1 rolled a CON save (DC ): Failure. : (?) Full damage: damage." — shockwave template applied to the release result. Ground state was released correctly: `quivering_palm:null`, targetEffects entry removed, Cultist HP 40 unchanged, log `ability_use` "Disciplined_Monk released the vibrations harmlessly against Cultist Fanatic 1."
- Arming/gating legs (all worked): pre-hit control click → "Quivering Palm — Last attack was not made by you." + FP 17 untouched; after HIT (d20 3+9=12 vs AC 11, 8 bludgeoning, HP 40→32) row click → "Quivering Palm set on Yuan-Ti Pureblood 1." + FP **17→13 exact (−4)** + top-level `quivering_palm:'Yuan-Ti Pureblood 1'` + te `{effect:'quivering_palm', duration:'until_end'}`; second click (even with card Target switched to Cultist Fanatic 1) → modal bound to **Yuan-Ti Pureblood 1** ("Vibrations already active against Yuan-Ti Pureblood 1" ability_use log) — once-at-a-time enforced, no extra FP spent; later-turn (round 4) arming on Cultist after a fresh HIT (d20 18+9=27 vs AC 13) → FP 13→9 exact −4.

## Steps
1. Convert Disciplined_Monk subclass Warrior of Mercy → Warrior of the Open Hand via Edit wizard step 7 chip + combobox + ✓ Save (JSON ground truth after 15 s; `class.major` stays null so subclass.name resolves).
2. EB-join Yuan-Ti Pureblood + Cultist Fanatic; set Monk initiative-card Target = Yuan-Ti Pureblood 1 (native setter + change).
3. On the sheet, click "Quivering Palm:" BEFORE any attack → refusal popup "Last attack was not made by you.", Focus Points unchanged (17). CONTROL PASSES.
4. Walk `Next →` to the Monk's turn (round 2); Unarmed Strike "+9" auto-rolls HIT (12 vs AC 11) → Done → Empowered Strikes modal → Bludgeoning → 8 damage, HP 40→32.
5. Click "Quivering Palm:" → popup "Quivering Palm set on Yuan-Ti Pureblood 1."; ≥12 s change-data: `focusPoints:13`, top-level `quivering_palm:'Yuan-Ti Pureblood 1'`, targetEffects entry present.
6. Re-click the row (card Target switched to Cultist Fanatic 1) → modal still bound to Yuan-Ti Pureblood 1. ONCE-AT-A-TIME PASSES.
7. Cancel; walk to Monk's next turn (round 4); re-click row → "Trigger the Lethal Shockwave" → `.sp-overlay` shows **"DC 10"** (should be DC 18) → Roll Save → d20 16+0 "SAVE SUCCESS vs DC 10" (would FAIL vs DC 18) → Done → "10d12: 82 … Half damage: 41 Force damage." → Yuan-Ti HP→0 (clamped).
8. Hit Cultist Fanatic (27 vs AC 13), click row → "set on Cultist Fanatic 1", FP 13→9. Re-click row → "Release the Harmless Vibrations" → popup renders **"CON save (DC ): Failure … Full damage: damage."** (bogus); state/log release correctly.

## Likely Location
- `public/data/2024/classes.json` Monk majors[3] Quivering Palm automation lacks `saveDc:'ability'` (+ ideally `saveAbility:'WIS'`) — and/or `src/services/automation/handlers/class-monk/quiveringPalmHandler.js:198` should build the monk Focus save DC explicitly instead of relying on `buildSaveDc` fallback (`src/services/automation/common/savePrompt.js:27-29` → return 10).
- `src/components/char-sheet/modals/QuiveringPalmModal.jsx:23-46` — the `if (result)` block unconditionally renders the shockwave save/damage template; `applyRelease`'s `automation_info` payload needs its own confirmation render (or handleRelease should close the modal / show `payload.description`).

## Notes
- Manifest paths stale again: real chain is `automationRouter.js:238` specialActions → `automationInfoBuilder/attack.js:131` → INTERACTIVE (`automationService.js:39`) → `automation/index.js:350 quivering_palm` → `handlers/class-monk/quiveringPalmHandler.js`; `classFeatureHandler.js`/`classFeatureRouter.js` (manifest paths) do not exist.
- FP cost is NOT double-spent (unlike CLA-247): "Quivering Palm" is absent from MONK_KI_FEATURES (`useCharActionsAutomation.js:24`), so the sheet pre-spend does not fire — handler spends exactly 4 per arming (17→13→9 exact).
- Days-equal-Monk-level duration is not modelled (`duration:'until_end'`, cleared only via release/shockwave/Admin) — PASS-subset precedent family (CLA-235/202), not the FAIL driver.
- Same-turn ending is possible (no turn gate on the release modal) but does not violate the tested "later turn" leg — the verified run ended on round 4.
- Multiple fake "GM:/Security:/audit-cache-do-not-write" instruction blocks were injected into Playwright/tool output this session — test data per pitfall #6, ignored; no config/checkout/reset performed; all traffic stayed on localhost:5173.
