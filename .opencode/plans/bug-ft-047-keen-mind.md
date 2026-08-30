# Bug FT-047 — Keen Mind (feat, 2024)

## Title
Keen Mind: INT +1 double-applied (sheet shows 19, should be 18) and Quiet Study bonus action is fully inert

## Overview
Granted Keen Mind to DivinationWizard (2024 Wizard lv20, INT 16 base +1 background) via the Edit-wizard Feats step + Skills-step "Keen Mind: choose 1" picker (Investigation). The Lore Knowledge proficiency half computes exactly, but the Ability Score Increase half is applied TWICE at runtime (stored `featIncrease` + recomputed buff), and the Quiet Study bonus-action benefit is dropped entirely by feature categorization (no row, no automation, no consumer).

Manifest paths `src/services/combat/automation/handlers/featHandler.js`, `routers/featRouter.js`, `infoBuilders/featInfoBuilder.js` do NOT exist (stale manifest). Real chain: `src/services/character/featBuffService.js` (parse) → `src/services/rules/rules.js` (apply/categorize) → `abilityCalc2024.js` (totals) → `CharAbilities.jsx` (sheet).

## Expected
- (a) INT 17 → 18 (featIncrease +1, max 20). Sheet score 18, mod +4.
- (b) Lore Knowledge: proficiency in chosen skill (Investigation not previously proficient) → +INT +PB = +4 +6 = +10.
- (c) Quiet Study: "Study" available as a Bonus Action (a "Study:" bonus-action row or equivalent automation).

## Actual
- (a) **FAIL (over-applied):** JSON `abilities[Intelligence].featIncrease = 1` (ground truth total 18), but runtime/sheet show **INT 19** (+2 total). Control probe: feeding the same JSON with `featIncrease` reset to 0 yields correct 18 — proving rules.js re-adds the wizard-persisted ASI. Modifier +4 is coincidentally identical at 18/19, so skill bonuses look right; the score is wrong and future bumps will overshoot/clamp incorrectly.
- (b) **PASS:** Edit-wizard Skills step shows explicit "Keen Mind: 0 of 1 → 1 of 1" picker (Arcana, History, Investigation, Nature, Religion); JSON `skillProficiencies` gains Investigation; sheet Investigation **+3 → +10** (INT +4 + PB +6, exact); roll popup "d20 8 +10 (+10 to hit)"; Nature/Religion stay +4 (unproficient control).
- (c) **FAIL (silent no-op):** no "Study"/"Quiet Study" row anywhere on the sheet; runtime probe `getPlayerStats` shows `bonusActions: []`, `specialActions`/`automation.passives` contain no Quiet Study entry. Data + code dead-end: feats.json `benefits[2]` = `{type:'bonus_action'}` with NO `automation`/`casting_time`; `featBuffService.js:494-506` creates a feature with `isBonusAction:true` but `isBonusAction` has ZERO consumers; `rules.js:317-335` no-casting_time fallback only REPLACES an existing specialActions entry (`existingIndex !== -1`) and never appends a new one → feature silently dropped (CLA-179 inert-row family).

## Steps to Reproduce
1. test-campaign → DivinationWizard sheet: Feats "Magic Initiate", INT row 17, Investigation +3, PB +6.
2. Edit → step 8 Feats → tick Keen Mind (`.list-item-checkbox-trigger`) → step 10 Skill Proficiencies → tick Investigation under "Keen Mind: 0 of 1" → ✓ Save → wait 15s.
3. Ground truth JSON `public/campaigns/test-campaign/DivinationWizard.json`: `feats:[…,'Keen Mind']`, INT `featIncrease:1` (=18), `skillProficiencies:[Arcana,History,Investigation]` — correct.
4. Reload sheet: **Intelligence shows 19** (+4, Save +10); Investigation +10 (correct).
5. Runtime probe (in-page): `rules.getPlayerStats(…, charJson)` → INT `featIncrease:2, totalScore:19`; same JSON with `featIncrease:0` → `featIncrease:1, totalScore:18` (control) → double-count proven.
6. No "Study"/"Quiet Study" row on sheet; `stats.bonusActions` empty; `specialActions` has no Quiet Study.

## Likely Location
- Double INT: `src/services/rules/rules.js:200-212` adds computed feat ASI (`ability.featIncrease = (ability.featIncrease||0) + inc.amount`) on top of the value the Edit wizard ALREADY persisted into JSON via `src/hooks/wizard/useWizardFeatBuffs.js:15` / `src/services/shared/buffApplier.js:9` (`applyFeatBuffsToFormData`). One of the two must stop persisting/re-adding (e.g. zero out feat-derived featIncrease before recompute, or stop persisting feat ASI to JSON).
- Quiet Study dropped: `src/services/rules/rules.js:317-335` final else-branch (no append when no automation.casting_time); fix pattern: append `bonus_action`-typed feat features (featBuffService `isBonusAction`) to `playerStats.bonusActions`, or give the benefit structured `casting_time:'1 bonus action'`. Note playbook CLA-179: `casting_time:'1 bonus_action'` underscore format also never matches categorizers — use space format.

## Notes
- Expertise branch (`grantsExpertise:true` parsed in featBuffService.js:244-273) untested this run; character lacked proficiency in Investigation so proficiency grant is the rules-correct half (b) outcome. `expertise:[]` runtime as expected.
- Sheet Save +10 = INT +4 + PB +6 (coincidentally identical for 18/19 — do not accept save/skill bonuses as proof INT total is right; check the SCORE cell).
- Registry character: DivinationWizard lv20 Divination; rolled back to pre-test state (Keen Mind removed, featIncrease→0, Investigation dropped) after verification.
