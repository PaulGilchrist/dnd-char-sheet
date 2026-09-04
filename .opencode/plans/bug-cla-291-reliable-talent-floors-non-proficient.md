# BUG CLA-291 — Reliable Talent floors EVERY sheet check, not just proficient ones

**Verdict: FAIL** (floors non-proficient too) — verified live 2026-09-03, campaign test-campaign, AasimarTest (2024 Rogue lv14, Soulknife major).

## Canonical expectation (2024)
"Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10." — floor ONLY on **proficient** skill/tool checks.

## Live evidence (e2e, sheet cell clicks)
- PROFICIENT (correct): Insight +6 (proficient) rolled d20 4 → popup `Insight | 16 | d20 4 +6 | Reliable Talent: d20 4 → 10` (total floored 10+6=16). d20 18 unreplaced (total 24).
- NON-PROFICIENT (WRONG): Animal Handling +1 (NOT in `skillProficiencies: ["Insight","Religion"]`) — 12-roll census raw d20 [12,5,12,16,8,5,10,19,1,5,8,8]; EVERY raw ≤9 floored to 10 with popup line `Reliable Talent: d20 N → 10` and total 11 (7 floored instances: rolls 5,8,5,1,5,8,8). Survival +1 (also non-proficient): raw 3,5,9,5 → all floored to total 11 with the RT popup line.
- Saves correctly NOT floored (control): Wisdom Save cell 6 rolls raw [3,19,17,5,9,7], totals [4,20,18,6,10,8], zero `.dice-roll-reliable-talent` divs.

## Root cause (grep-proven chain, manifest paths stale)
`rules.js:174/467` → `collectSaveModifiers` (`automationModifiers.js:107` emits `{target:'ability_check', effect:'reliable_talent'}`) → `conditionEffectsInternal.js:10,265` (`saveModifierApplies` returns `true` unconditionally; `effects.reliableTalent = true`) → `CharAbilities.jsx:182-184` `makeCheckContext` stamps `ctx.reliableTalent` on EVERY ability/skill/tool check cell click → `DiceRollResult.computed.js:75` floors `displayRoll <= 9 → 10+bonus+modifier` with **no proficiency gate**. There is no proficiency check anywhere in the chain (contrast `psiBolsteredKnack` at `CharAbilities.jsx:202-204` which correctly gates via `isProficientSkillOrToolCheck(playerStats, checkName)`).

## Secondary gaps (grep-proven)
1. Data level deviation: `public/data/2024/classes.json` puts base Rogue Reliable Talent at **lv7** (canonical lv11).
2. Floor is popup/runtime-only: roll log entries keep the raw pre-floor d20/total (log `Insight rolls [4] total 4` while popup showed 16); floored value reaches popup total + runtime `lastAbilityCheck.d20` (`useLoggedDiceRollAttack.js:302-318`) but not the logged roll. Cosmetic family (CLA-196/281).
3. Raw ability-check cells (no skill/tool, rollType 'check') also floored — same no-proficiency defect.

## Suggested fix
Gate the modifier at the sheet consumer: in `CharAbilities.jsx` makeCheckContext, only set `ctx.reliableTalent` when `isProficientSkillOrToolCheck(playerStats, checkName)` (reuse existing helper), and restrict `automationModifiers.js:110` target semantics accordingly. Fix `classes.json` Reliable Talent level to 11 (targeted edit preserving indentation).

## Cleanup
Admin Clear Change Data + Clear Campaign Log executed (POST localhost admin endpoints); disk-absence confirmed.
