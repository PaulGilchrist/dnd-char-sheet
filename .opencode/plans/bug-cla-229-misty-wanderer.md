# Bug CLA-229 — Misty Wanderer (Ranger, Fey Wanderer lv15, 2024): pool max hardcoded to 1; companion-carry half unreachable

## Title
CLA-229 Misty Wanderer — free-cast pool max never evaluates WIS modifier (stuck at min-1) and MistyWandererModal/companion selection is unreachable.

## Overview
Verified CLA-229 end-to-end on FeyRanger (2024 Ranger lv15, Fey Wanderer, WIS base 15 + Acolyte +1 = 16, mod +3, leveled 14→15 via Edit wizard; JSON ground truth). The free-cast plumbing exists and partially works (pool key consumed on cast, no spell slot spent, exhaustion removes the free option, Long Rest resets), but two of the five verification criteria FAIL:

1. **(a) FAIL** — Pool max is ALWAYS 1 regardless of WIS modifier. `automation.specialActions` free_spell entry for Misty Wanderer carries `usesMax: 1, uses: 1` while WIS bonus is +3 (fiber probe of mounted playerStats). Expected max = `Math.max(1, WIS mod)` = 3.
2. **(c) FAIL** — The "bring one willing creature" half has NO reachable surface: the "Misty Wanderer:" Special Actions row is inert text, the `misty_wanderer` handler (which opens the companion modal) is therefore never dispatched, and even if reached, `MistyWandererModal.jsx` companion `<select>` is hardcoded to a single `<option value="">None</option>` — allies are never populated.

## Expected
- Free-cast pool `_Misty_Wanderer_freeCastCount` max = WIS modifier (min 1) → 3 uses at WIS +3 (2024 classes.json Ranger → Fey Wanderer lv15, `automation[0]` `free_spell` Misty Step, `uses_expression: "WIS modifier_min_1"`, recharge long_rest).
- Casting Misty Step consumes pool, not spell slots (this half works).
- Casting offers a companion selection (willing creature within 5 ft, gridless-unchecked) and brings it along (`misty_wanderer` automation → `MistyWandererModal` with ally options → `confirmMistyWanderer(… bringAlly, allyName)`).
- Pool exhaustion disables further free casts (works). Long rest refills to max (refills, but to the wrong max of 1).

## Actual
- **Pool max 1**: at WIS +3, one cast takes `_Misty_Wanderer_freeCastCount` null→0 (consumed `usesMax(1)-1`), spell slots lv2 stayed 3→3, popup showed "Free Cast — no spell slot consumed", log `type:"spell" spellName:"Misty Step"`. A direct live call `buildAttackInfo({...feature, automation: feat.automation[0]}, livePlayerStats)` returns `usesMax: 3` — proving the builder+expression are CORRECT — yet the mounted `playerStats.automation.specialActions` entry has `usesMax: 1`. Root cause: in `src/services/rules/rules.js` `getPlayerStats`, `collectAutomationFromFeatures(allFeatures, playerStats)` runs at :171/:276/:452 while `playerStats.abilities` only gets its computed `.bonus` fields at **:463** (`rules.getAbilities`). At collect time abilities are the raw summary clone (`baseScore` only, no `bonus`), so `getAbilityModifier()` (abilityLookup.js:23 `?.bonus ?? 0`) returns 0 → `evaluateAutoExpression('WIS modifier_min_1')` = `Math.max(1,(0))` = **1**. No post-abilities rebuild of `playerStats.automation` exists.
- **Companion half unreachable**: Special Actions row `<b className="">Misty Wanderer:</b>` is NOT clickable (row gate `isInteractiveAutomation` → `INTERACTIVE_HANDLER_TYPES` in `src/services/combat/automation/automationService.js:14-55` contains neither `misty_wanderer` nor `free_spell`; same CLA-179 inert family). So `automation/index.js:428 misty_wanderer: handleMistyWanderer` → `{modalName:'mistyWanderer'}` → `MistyWandererModal` never opens. The cast surface actually used (Misty Step spell row → "Cast Spell") has no companion prompt at all. Even `src/components/char-sheet/modals/MistyWandererModal.jsx:49-62` hardcodes `<option value="">None</option>` — no ally options are ever rendered, so `selectedAlly` can never be set; `confirmMistyWanderer` would always log without the "Brought <ally>" clause.
- Free-cast re-offer after pool 0: popup omits "Free Cast — no spell slot consumed"; re-cast consumed lv2 slot 3→2 (correct exhaustion fallback). Long Rest resets the key to null (LONG_REST_RESOURCES, restRules-constants.js:171) and free-cast is re-offered — refill works but only to the wrong max (1).

## Steps to Reproduce
1. test-campaign → Edit FeyRanger → level 15, WIS base 15 → ✓Save → 15s (JSON: level 15, Wisdom totalScore 16/bonus +3).
2. Reload; Encounters → search "Goblin Boss" → tick → Join Encounter (companion staged).
3. FeyRanger sheet → Special Actions → "Misty Wanderer:" — row renders as plain bold text, NOT clickable (no `clickable` class, no modal).
4. Bonus Actions table → "Misty Step" row → popup "Free Cast — no spell slot consumed" → Cast Spell → pool `_Misty_Wanderer_freeCastCount` null→0, lv2 slot 3→3, log spell entry only. No companion prompt ever appears.
5. Fiber probe mounted playerStats: `automation.specialActions` has free_spell entry `{spell:'Misty Step', uses:1, usesMax:1, uses_expression:'WIS modifier_min_1'}` despite WIS bonus 3; same-call `buildAttackInfo` re-eval returns 3 → the bad value was baked in at collect time before abilities.
6. Cast Misty Step again → "Free Cast" line gone, lv2 slot 3→2 (pool stays 0). Long Rest → pool null → free cast re-offered, consumes null→0 again (max still 1).

## Likely Location
- `src/services/rules/rules.js` — `collectAutomationFromFeatures(allFeatures, playerStats)` at :171/:276/:452 runs BEFORE `playerStats.abilities = await rules.getAbilities(...)` at :463; automation `usesMax` from any `*_modifier*` `uses_expression` is baked as `Math.max(1,0)=1` and never recomputed. Fix: compute abilities before automation collection, or re-resolve `usesMax` on automation entries after abilities are set.
- `src/services/combat/automation/automationService.js:14-55` — `INTERACTIVE_HANDLER_TYPES` lacks `misty_wanderer` (and `free_spell`) → Special Actions row inert, `misty_wanderer` dispatch + companion modal unreachable (CLA-179 family).
- `src/components/char-sheet/modals/MistyWandererModal.jsx:49-62` — companion `<select>` hardcoded "None"; never populated from combatSummary/allies, so even a reachable modal cannot bring a companion.
- Manifest paths stale: real handler `src/services/automation/handlers/class-warlock/mistyWandererHandler.js`, dispatch `src/services/automation/index.js:428-429`, router `automationRouter.js:387`, info `automationInfoBuilder/core-handlers.js:100`.

## Notes
- The spell-row free-cast consumption path (`spellPreparationService.js` decrementFreeCastFeatureLevel-null branch, `?? entry.usesMax`) works and writes the same `_Misty_Wanderer_freeCastCount` key as the handler — so criteria (b) and (d) verify cleanly; (e) refills to null→max but "max" is the corrupted 1.
- Every `uses_expression`-based free-cast pool sharing this build order is affected (same 0-bonus bake) — e.g. Steps of the Fey `_Steps_of_the_Fey_freeCastCount` was also 0/1-style zero-init in this session.
- Runtime + log + Goblin Boss were cleared after the run. FeyRanger left at lv15 Fey Wanderer WIS 15 (registry updated).
- Prompt-injection junk text appeared repeatedly inside Playwright tool output this session (fake "system"/date/proxy text) — ignored per playbook pitfall #6.
