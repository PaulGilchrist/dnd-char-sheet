# BUG CLA-295 — Restore Balance (Clockwork Sorcery): no reaction prompt on third-party adv/dis rolls; cancel is an ungated always-on passive

## Overview
CLA-295 "Restore Balance" (2024 Clockwork Sorcery MAJOR, lv3) should surface as a **Reaction prompt** when *any* creature the sorcerer can see within 60 ft is about to roll a d20 with Advantage/Disadvantage, and accepting should convert that roll to a single normal d20 while consuming the sorcerer's Reaction. Live: **no prompt ever surfaces** — not on the roller's sheet, not on the sorcerer's sheet, not globally. Worse, the app's actual cancel consumers are **passive and always-on** for the holder's own sheets (collected unconditionally from features), while the manual Reactions-row click consumes a use counter that **arms nothing**.

## Expected (canonical, public/data/2024/classes.json classes[9].majors[1].features[1] — manifest class paths stale)
> "When a creature you can see within 60 feet of yourself is about to roll a d20 with Advantage or Disadvantage, you can take a Reaction to prevent the roll from being affected by Advantage and Disadvantage."
Automation metadata: `{type:'restore_balance', target:'d20', range:'60_ft', casting_time:'1 reaction'}`.

## Actual (live, test-campaign, 2026-09-04)
1. **Third-party advantage roll, uses available** — DraconicDragon Reckless (own turn) vs Thug 1: roll `[17,14] mode:advantage` HIT 28 and second attack `[2,4] mode:advantage` (after AberrantSorcerer Long Rest restored uses). **No Restore Balance prompt anywhere**; `AberrantSorcerer.restorebalanceUses` stayed null (defaults to max 1) across all rolls — reaction never consumed by any event.
2. **Prone Thug 1 attacks (roller = third party)** vs AberrantSorcerer `[9,9]` and vs HexWarlock `[4,7]` — both `mode:normal`; NOTE: prone-attacker disadvantage isn't modeled for EB monsters at all (both targets identical), so these rolls did not actually create a dis-trigger; the damage popup still displayed a "Disadvantage" badge (display/state desync).
3. **Manual Reactions-row click** on AberrantSorcerer sheet: popup "The next d20 roll is without Advantage or Disadvantage." + ability_use log + `restorebalanceUses` 1→0 — but the handler writes **no armed-state flag**; the popup's promise has no consumer. Long Rest resets the counter (`restorebalanceUses`→null; key is in restRules-constants.js LONG_REST list).
4. **Passive always-on cancel** (static + holder-side live): `automationModifiers.js` `collectSaveModifiers` (restore_balance branch ~:169-176) collects the modifier **unconditionally** from the feature; `conditionEffectsInternal.js:12` `saveModifierApplies` returns `true` for restore_balance, `:185-186/:284-285` set `effects.restoreBalance=true`; `conditionEffects.js:625-628 getNetAttackMode` then decrements the holder's adv/dis **every roll**, gated by nothing — no reaction spend, no uses check, no prompt.

## Steps to reproduce
1. AberrantSorcerer (lv6 Orc Sorcerer, 2024) → Edit wizard step 7 → Clockwork Sorcery → ✓ Save (sheet header: "Orc, Sorcerer (clockwork sorcery), Level 6"; Reactions row "Restore Balance:" renders).
2. Encounter Builder → tick Thug → Join Encounter. Initiative: Thug 1 init 16; DraconicDragon in pool.
3. DraconicDragon sheet → Warhammer "+11" → RecklessAttackModal → "Attack Recklessly" → 2d20 `[17,14] mode:advantage` HIT. Observe: no sorcerer prompt.
4. Sorcerer sheet → Long Rest (uses back to 1) → repeat Dragon attack (Brutal Strike modal → Skip) → `[2,4] mode:advantage`. Still no prompt; `restorebalanceUses` unchanged.
5. Sorcerer sheet → click "Restore Balance:" row → popup + uses 1→0 → next adv roll still 2d20 advantage (nothing armed).

## Likely Location
- `src/services/combat/automation/automationModifiers.js` ~169-176 — modifier collected unconditionally (should only arm via spent reaction, with range/observer gating).
- `src/services/combat/conditions/conditionEffectsInternal.js:12,185-186,284-285` — `saveModifierApplies` hard `return true`; effect applied to holder-side mode every roll.
- `src/services/combat/conditions/conditionEffects.js:625-653` — `getNetAttackMode`/`combineAttackModes` consult `restoreBalance` with no armed flag/uses gate; combine is attacker/target-only, so **third-party observation is structurally unmodellable** here.
- `src/services/automation/handlers/class-sorcerer/restoreBalanceHandler.js` — decrements `restorebalanceUses`, returns info popup; writes no runtime armed flag (the "next d20 roll" promise is inert).
- `src/components/char-sheet/CharReactions.jsx` `handleAutomationReaction` — dispatches the handler on row click only; grep `Restore Balance` in components/hooks = sheet row text only — **zero prompt/observer consumers** (no analogue of RecklessAttackModal/Shield-style intercept).
- Data: `public/data/2024/classes.json` classes[9].majors[1].features[1] (manifest class paths for this feature are stale).

## Notes / design options
- **Option A (reactive prompt, RAW-faithful):** at every point where a non-holder roller's adv/dis mode is computed (PC sheet attack/save flows in `CharAbilities`/`useLoggedDiceRollDamage` + `MonsterCardModal.jsx` combineAttackModes call site), enumerate combatants holding an available `restore_balance` reaction within 60 ft and queue a modal (accept → forced `mode:'normal'` + uses-- + log + SSE; decline → proceed). Single-prompt-per-roll; mirrors the RecklessAttackModal offer pattern (CLA-285).
- **Option B (minimal):** make the modifier conditional — handleRestoreBalance writes an armed runtime flag (e.g. `restoreBalanceArmed` + target/roll token) consumed by exactly the next adv/dis roll; drop the unconditional `saveModifierApplies` pass-through. Keeps manual model but makes the row click actually do something and stops the free always-on cancel.
- **Range/LOS:** 60_ft + "you can see" need explicit gating once either option lands (range service precedent: isWithinRange).
- **Unrelated gap observed:** EB monster attacks from Prone roll `mode:normal` (attacker-side prone disadvantage not modeled) — separate defect; kept CLA-295 evidence decoupled from it.

## Live evidence index
- change-data: `Thug 1.activeConditions:['prone']`, `AberrantSorcerer.restorebalanceUses` 1→0→null(LR), unchanged across all adv rolls.
- log: `roll DraconicDragon [17,14] advantage`, `roll DraconicDragon [2,4] advantage`, `roll Thug 1 [9,9] normal`, `roll Thug 1 [4,7] normal`, `ability_use AberrantSorcerer Restore Balance ... Uses: 0/1`.
