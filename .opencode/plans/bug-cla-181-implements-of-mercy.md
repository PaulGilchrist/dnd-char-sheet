# Bug CLA-181 — Implements of Mercy (2024 Monk / Warrior of Mercy lv3)

**Result: FAIL** — proficiency grant never applied (skills, tools, and feature display all missing/miscounted).

## Feature (data)
`public/data/2024/classes.json` → Monk → majors[0] "Warrior of Mercy" → features[4]:
`{ "name": "Implements of Mercy", "description": "Gain proficiency in Insight and Medicine skills and Herbalism Kit.", "level": 3 }`
Feature has **no automation and no machine-readable proficiency grant fields**.

## Evidence (Playwright, MercyMonk sheet, test-campaign, 2024, lv17)
- Sheet: `Wisdom 16 → +3`, `Proficiency: +6`
- `Insight (+9)` — proficient, BUT Insight is in stored `skillProficiencies: ['Insight','Religion']` (lv1 class skill choice), so this is NOT from the feature
- **`Medicine (+3)` — NOT proficient. Expected +9 (PB 6 + WIS 3).** FAIL
- **Tools line: `Proficiencies: Light Martial Weapons, Simple Weapons, Calligrapher's Supplies` — no Herbalism Kit.** FAIL
- Feature text "Implements of Mercy" not rendered anywhere in sheet innerText. FAIL
- Ground truth `public/campaigns/test-campaign/MercyMonk.json`: `skillProficiencies: ['Insight','Religion']`, `toolProficiencies: ["Calligrapher's Supplies"]` — no Medicine, no Herbalism Kit.

## Root cause chain
1. `src/services/rules/core/abilityCalc2024.js:31` — skill proficient solely from stored `playerStats.skillProficiencies`; no scan of subclass features.
2. `src/services/character/proficiencyUtils.js:87` — non-skill proficiencies merged only from `bonusSource.bonus_proficiencies`; `proficiencyUtils.js:54` only bumps allowed *count* for `bonus_skill_proficiencies`. Warrior of Mercy major object contains **neither** field (verified: name/description/spells/spellcasting only).
3. No code greps feature descriptions for "Gain proficiency in …" at level unlock (race traits have a parser in `rules-proficiencies.js:34`, majors do not). Zero grep hits for `implementsOfMercy` in src/.

## Fix recipe
Option A (data): add to Warrior of Mercy major in `public/data/2024/classes.json`:
`"bonus_skill_proficiencies": 2` won't grant actual proficiency (count only) — need actual names, so add
`"bonus_proficiencies": ["Skill: Insight", "Skill: Medicine", "Herbalism Kit"]`? Note `bonus_proficiencies` currently filters OUT `Skill:`-prefixed entries for non-skill pass (proficiencyUtils.js:67) and skills path only counts — so both paths need work.
Option B (code, cleaner): in `getProficiencies2024` (`rules-proficiencies.js`), collect `playerStats.class.major.features` with `feature.level <= playerStats.level` and parse "Gain proficiency in X and Y skills and Z Kit" (reuse regex style of race-trait parser at rules-proficiencies.js:34), merging `Skill: …` into skill list and kit names into tool list; then abilityCalc picks it up only if skillProficiencies is the enriched set — so enrichment must land in `playerStats.skillProficiencies` before `abilityCalc2024.js:31` runs (e.g., enrich in `rules.js` near line 189 like the all_skills feat buff at rules.js:214-219).
Tool display reads computed non-skill proficiencies, so tool side works once merged into proficiencyUtils output.

## Cleanup
Nothing written to campaign/SSE/log (read-only verification). No Admin clears needed.
