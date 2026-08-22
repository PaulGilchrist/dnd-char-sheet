# Bug: FT-018 Boon Of Skill - Proficiency Not Applied to Ability Checks

## Summary
Boon Of Skill feat correctly adds all 18 skills to `playerStats.skillProficiencies` at runtime (via `rules.js:214-220`), and the character sheet display shows +5 proficiency for all skills. However, the grapple action handler (`useCharActionsBaseActions.js`) does NOT check `playerStats.skillProficiencies` when calculating the ability check bonus, so the proficiency bonus is never added to the roll.

## Evidence

**Character:** Boon Test (2024 ruleset, Level 20, Human Fighter/Battle Master)
**Feats:** Savage Attacker, Boon Of Irresistible Offense, Boon Of Recovery, **Boon Of Skill**
**JSON skillProficiencies:** `["Athletics", "Intimidation"]` (only base proficiencies)
**Runtime skillProficiencies:** All 18 skills (applied by `getPlayerStats()`)
**Character sheet display:** All 18 skills show +5 (-1 mod + 6 prof bonus) — **CORRECT**
**Grapple log entry:** `"Strength check: 11 (d20: 12 + -1) vs target STR (+0) — Success"` — **MISSING +6 PROFICIENCY**

Expected: `Strength check: 17 (d20: 12 + -1 + 6)` — proficiency bonus should be added.

## Root Cause

`src/components/char-sheet/useCharActionsBaseActions.js:163-169`:

```javascript
const abilityMod = isMonk ? dexMod : strMod;
let checkBonus = abilityMod - exhaustionPenalty;
const isJackOfAllTrades = playerStats?.automation?.passives?.some(p => p.type === 'jack_of_all_trades');
if (isJackOfAllTrades) {
    const proficiency = Math.floor((playerStats.level - 1) / 4 + 2);
    checkBonus += Math.floor(proficiency / 2);
}
```

The `checkBonus` is calculated as `abilityMod - exhaustionPenalty`. Jack of All Trades adds half proficiency. But there is **no code** that checks `playerStats.skillProficiencies` to add the full proficiency bonus when the character is proficient in the relevant skill.

## Affected Code Paths

1. **Grapple action** (`useCharActionsBaseActions.js:143-231`): `handleGrappleAction` calculates `checkBonus` without checking proficiency.
2. Any other action/automation that performs ability checks using the same pattern.

## Not Affected

- **Character sheet display**: Correctly shows proficiency bonuses because `abilityCalc2024.js:26` checks `playerStats.skillProficiencies.includes(skill.name)` when computing `ability.bonus`.
- **Skill click rolls**: `CharAbilities.jsx:347` calls `rollAbilityCheck(skillName, ability.bonus - exhaustionPenalty, ...)` where `ability.bonus` already includes proficiency.
- **Saving throws**: Correctly use `playerStats.saveBonuses` which include proficiency.

## Fix Required

In `handleGrappleAction`, after calculating `checkBonus`, check if the character is proficient in the relevant skill (Athletics for Strength-based grapple) and add the proficiency bonus:

```javascript
// After line 169, before line 170:
const proficiencyBonus = Math.floor((playerStats.level - 1) / 4 + 2);
const isProficient = playerStats.skillProficiencies?.includes('Athletics');
if (isProficient && !isJackOfAllTrades) {
    checkBonus += proficiencyBonus;
}
```

Or more generally, check if the character has proficiency in any skill that uses the ability being checked.

## Verification Steps

1. Load Boon Test character (2024, has Boon Of Skill feat).
2. Verify character sheet shows all 18 skills with +5 bonus.
3. Trigger a grapple action against a target.
4. Check the log entry — should show proficiency bonus added to the Strength check.
5. Expected: `Strength check: 17 (d20: 12 + -1 + 6)` instead of `Strength check: 11 (d20: 12 + -1)`.

## Related Files

- `src/components/char-sheet/useCharActionsBaseActions.js` — grapple action handler (bug location)
- `src/services/rules/rules.js:214-220` — applies `all_skills` feat buff to `skillProficiencies` (working correctly)
- `src/services/character/featBuffService.js:242-243` — parses "all skills" benefit into `{ name: 'all_skills', type: 'skill' }`
- `src/services/rules/core/abilityCalc2024.js:26` — uses `skillProficiencies` for display (working correctly)
- `public/data/2024/feats.json` — Boon Of Skill feat definition with `automation.effect: "all_skill_proficiencies"`
