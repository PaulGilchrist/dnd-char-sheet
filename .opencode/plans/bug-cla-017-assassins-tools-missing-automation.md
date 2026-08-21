# Bug: CLA-017 - Assassin's Tools Missing Automation

## Title
CLA-017 Assassin's Tools (Rogue Assassin 2024) - Feature has no automation despite manifest claiming poison creation on weapons

## Overview
The manifest for automation CLA-017 states that "Assassin's Tools" should allow the Rogue Assassin to magically create poison on weapons/ammunition, forcing a Constitution saving throw on hit for poison damage. However, the feature definition in `public/data/2024/classes.json` contains NO `automation` field at all. The feature only grants proficiency with Disguise Kit and Poisoner's Kit.

## Expected Behavior
Per the manifest, when the Rogue Assassin hits with an attack using an infused weapon or ammunition:
1. The target must succeed on a Constitution saving throw
2. On a failed save, the target takes poison damage

## Actual Behavior
The "Assassin's Tools" feature in `public/data/2024/classes.json` (line 10027) is defined as:
```json
{
    "name": "Assassin's Tools",
    "description": "Gain Disguise Kit and Poisoner's Kit, proficiency with them.",
    "level": 3
}
```
There is no `automation` field. The automation collector at `src/services/combat/automation/automationCollector.js:23` skips any feature without an `automation` field (`if (!feature?.automation) return`), so this feature is never processed for combat automation.

No poison damage is applied when the Rogue Assassin makes an attack. The feature only grants tool proficiencies (visible in the character sheet under Proficiencies: "Disguise Kit, Poisoner's Kit").

## Steps to Reproduce
1. Open "test-campaign" in the app
2. Select the "RogueAssassin" character (Level 3 Human Rogue/Assassin, 2024 rules)
3. Verify the character has "Assassin's Tools" in Special Actions (shows "Gain Disguise Kit and Poisoner's Kit, proficiency with them.")
4. Make an attack against a target in combat
5. Observe that no poison damage or Constitution save is triggered
6. Check `public/data/2024/classes.json` line 10027 - the feature has no `automation` field

## Likely Location
- **Data definition**: `public/data/2024/classes.json` line 10027 - "Assassin's Tools" feature entry is missing the `automation` field entirely
- **Automation collector**: `src/services/combat/automation/automationCollector.js` line 23 - features without `automation` are skipped
- **Automation router**: `src/services/combat/automation/automationRouter.js` - no routing for this effect type
- **Info builder**: `src/services/combat/automation/infoBuilders/class-feature-handlers.js` - no handler for Assassin's Tools poison effect

## Notes
- The 5e Assassin subclass (`public/data/classes.json`) has a "Bonus Proficiencies" feature at level 3 (not "Assassin's Tools") which also has no automation - it only grants tool proficiencies
- The 2024 Assassin subclass does have an "Envenom Weapons" feature at level 13 with poison damage automation, but that is a different feature (level 13, different trigger: `cunning_strike_poison_save_fail`)
- The character `RogueAssassin.json` in `test-campaign` is a level 3 Rogue/Assassin (2024 rules) and correctly shows the feature in the UI, but with no combat effect
- The manifest description ("magically create poison on weapons or ammunition") does not match the actual 2024 rules text ("Gain Disguise Kit and Poisoner's Kit, proficiency with them.") - this appears to be a misattribution of a different feature's behavior
