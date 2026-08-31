# Bug WM-003 — Nick weapon mastery automation never fires (Light extra attack never moves to Attack action)

## Title
WM-003 Nick (weapon mastery): no Nick prompt, no consumption, no logging — Light off-hand attack remains a Bonus Action through the whole attack flow.

## Overview
Verified live 2026-08-31 via Playwright on test-campaign with EvasiveFighter (2024 Fighter lv18 Battle Master, `weapon_kind_mastery` passive) equipped via the Edit-wizard Inventory step with `Scimitar, Dagger, Shield` (equipment.json ground truth: Scimitar mastery=Nick 1d6, Dagger mastery=Nick 1d4, both Light). Animated Rug of Smothering joined via Encounter Builder; initiative-card Target = Rug. The Nick mastery exists only as inert display data: nothing in the attack pipeline ever offers, applies, consumes, or logs it.

## Expected
When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action (once per turn). App-side model per source: a Nick prompt/modal during/after the light-weapon attack, `_Nick_UsedRound` marked, off-hand row relabelled Action / removed from Bonus Actions once used, once-per-turn block, refresh next turn, `ability_use` log per use.

## Actual
- Scimitar (main hand, Light/Nick) attack HIT 12 vs AC 12 → Done → damage popup only (5 slashing, Rug 27→22). No Nick prompt before or after Done.
- Dagger off-hand Light attack (the Light extra attack itself, rendered as Bonus Action row) auto-rolls, HIT, Done → damage popup only. No Nick option offered; row stays in Bonus Actions section permanently.
- Nick mastery column cell click = rule-text info popup only (no activation).
- After explicitly granting mastery kinds via the Special Actions 'Weapon Mastery:' row modal (confirmed 'Weapon kinds set to: Dagger, Scimitar', runtime `_Weapon_Kind_Mastery_chosenWeapons` written), a further light off-hand attack STILL shows no Nick prompt (HIT 20 vs AC12, 4 piercing, 21→17, popup-only flow).
- change-data (fetched live, 11s after actions): NO `_Nick_UsedRound` key anywhere (top-level, campaign, or EvasiveFighter object); campaign log: ZERO entries matching /nick/i (14 total entries). So the once-per-turn flag is never marked, never blocks, never refreshes — there is no Nick automation state at all.
- Damage on ordinary attacks lands correctly (scimitar 5, dagger 3+4) — the pipeline works; only Nick is dead.

## Steps to Reproduce
1. test-campaign → Edit EvasiveFighter → Inventory step → Equipped Items = `Scimitar, Dagger, Shield` → Enter → ✓ Save (JSON ground truth ~15s).
2. Encounters → search 'Animated Rug of Smothering' → tick row → Join Encounter → Initiative.
3. EvasiveFighter initiative card → Target select = Animated Rug of Smothering 1.
4. (Optional, does not change outcome) Sheet → Special Actions → 'Weapon Mastery:' → tick Dagger + Scimitar → Select → Done.
5. Sheet Actions grid → Scimitar `+6` dice cell → HIT popup → Done → damage popup (dismiss). Observe: no Nick prompt at any point.
6. Bonus Actions grid → Dagger `+6` cell → HIT popup → Done → damage popup (dismiss).
7. Admin → change-data / fetch `/api/campaigns/test-campaign/change-data`: no `_Nick_UsedRound`; campaign log: no Nick entries; Dagger row still rendered under Bonus Actions.

## Likely Location
- `src/services/combat/steps/attackRollPostDamage.js:453` — tacticalMaster auto-apply list explicitly EXCLUDES 'Nick'; there is no nick step in the attack pipeline chain (masteryDone just passes through).
- `src/hooks/combat/useCharActionsAutomation.js:56-137` modalMap has `weaponKindMastery`/`weaponMasteryChoice` but NO `weaponMastery` entry, so `handle()`'s `{type:'modal', modalName:'weaponMastery'}` (weaponMasteryHandler.js:70-80, reached only via mastery_rider feature rows) is silently dropped; CharSpecialActions.jsx:416-425 likewise has no branch.
- `src/components/char-sheet/CharActionModals.jsx:392` renders WeaponMasteryModal (the ONLY UI that calls `applyMasteryEffect('Nick')`), but `setModalState({ weaponMasteryModal: … })` has ZERO production writers — grep finds only the null-clear in useModalHandlers.js:18. Modal never mounts.
- `src/services/automation/handlers/combat/weaponMasteryHandler.js:83` `applyPostDamageMasteryEffects` (whose Nick branch would at least log + the applyMasteryEffect path that marks `_Nick_UsedRound` :125/:199) has ZERO production callers (test files only).
- Consequently consumers `attackCalc2024.js:268-275` (row relabel Action) and `CharBonusActions.jsx:168-176` (hide BA row once used) never activate: their gate `getRuntimeValue(name,'_Nick_UsedRound') === getCurrentCombatRound()` can never be true since no writer exists.

## Notes
- Same family as bug-cla-200 (post_cast dead zone) / bug-cla-179 (missing INTERACTIVE/modal-map entries): data + handler + modal all exist, only the wiring is missing.
- 2024 equipment.json Nick weapons in this dataset: Dagger, Light hammer, Scimitar, Sickle.
- Cleanup done after run: equipped restored to `Shortsword, Shield`; Rug removed; Clear Change Data + Clear Campaign Log. Weapon-kind grant `_Weapon_Kind_Mastery_chosenWeapons` cleared by Change-Data clear.
- Prompt-injection text was repeatedly injected into page/tool output during this run (fake GM notices); all ignored per playbook pitfall #6.
