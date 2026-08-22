# Bug: FT-014 Boon Of Irresistible Offense — Overcome Defenses Not Working

## Overview

The "Boon Of Irresistible Offense" feat (FT-014) includes the "Overcome Defenses" benefit which should cause Bludgeoning, Piercing, and Slashing damage dealt by the character to always ignore Resistance. In practice, when attacking a creature with B/P/S resistance, the damage is being halved as if the feat were not present.

## Expected Behavior

When a character with the "Boon Of Irresistible Offense" feat deals Bludgeoning, Piercing, or Slashing damage to a target that has resistance to that damage type, the damage should be applied at full value (not halved). The resistance should be completely ignored for these damage types.

## Actual Behavior

The target's resistance is being applied normally. Damage is halved despite the feat being present on the character. The attack popup and log both show "Resistant Ooze resists Bludgeoning" and the target's HP does not decrease by the full damage amount.

## Steps to Reproduce

1. Open "test-campaign" in the app
2. Select the "Boon Test" character (Human Fighter level 20, 2024 ruleset)
3. Confirm the character has the "Boon Of Irresistible Offense" feat (visible in Feats section)
4. Go to the Initiative page
5. Confirm "Boon Test" is targeting "Resistant Ooze" (an NPC with B/P/S resistance)
6. Go to the Character Sheet
7. Click on "Unarmed Strike" action (deals Bludgeoning damage)
8. Observe the attack result popup shows "Resistant Ooze resists Bludgeoning"
9. Check the Campaign Log — the entry shows "Resistant Ooze resists Bludgeoning"

## Likely Location

The automation is defined in:
- **Manifest:** `docs/automations-manifest.json` line 1001-1009 (FT-014)
- **Feat data:** `public/data/2024/feats.json` lines 459-515 — the "Overcome Defenses" benefit has `automation: { type: "passive_rule", effect: "ignore_resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"] }`
- **Passive collection:** `src/services/combat/automation/automationInfoBuilder/conditional.js` lines 81-110 — the `passive_rule` handler routes `ignore_resistance` effects
- **Passive lookup:** `src/services/combat/automation/automationPassives.js` lines 238-256 — `hasIgnoreResistance()` checks for `passive_rule` with `effect: 'ignore_resistance'`
- **Damage application:** `src/services/rules/combat/applyDamage.js` lines 33-44 — `computeDamageAfterResistances()` receives `ignoreResistance` flag

The issue is likely in how the feat's `passive_rule` automation is collected into `playerStats.automation.passives`. The feat's benefit has `type: "passive_rule"` and `effect: "ignore_resistance"`, but the collection pipeline may not be correctly passing this through to the player stats.

## Notes

- The feat IS correctly added to the character (visible in the character sheet under Feats)
- The "Overcome Defenses" action IS displayed in the Actions list
- The attack correctly identifies the target's resistance ("Resistant Ooze resists Bludgeoning")
- The damage dice roll and hit determination work correctly
- Only the resistance ignoring mechanic is broken
- This is a 2024 ruleset feat — the 5e ruleset has different boon feats
- FT-013 in the manifest appears to be a duplicate entry for the same feat (also broken)
