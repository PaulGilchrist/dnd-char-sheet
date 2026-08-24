# Bug: CLA-121 — Empowered Strikes Damage Type Choice Not Triggering

## Summary
When a Warrior of the Elements Monk (level 6+) hits with an Unarmed Strike, the Empowered Strikes feature should present a damage type choice modal (Force or Bludgeoning). Instead, the attack damage is applied with the default Bludgeoning type and no modal appears.

## Expected Behavior
Per the 2024 ruleset class data (`public/data/2024/classes.json` line 5965):
> **Empowered Strikes** (level 6): "Whenever you deal damage with your Unarmed Strike, it can deal Force damage or its normal damage type (your choice)."

The automation type is `damage_type_modifier` with `trigger: "unarmed_strike_hit"` and `casting_time: "passive"`. When the Monk hits with Unarmed Strike, a modal should appear offering Force and Bludgeoning as damage type choices.

## Actual Behavior
1. Monk clicks Unarmed Strike attack → d20 roll shows (e.g., 15+9=24, HIT)
2. No damage type choice modal appears
3. Damage is applied with default Bludgeoning type
4. Log entry shows: `1d12+3 [Bludgeoning]` instead of Force

## Evidence
- **Test character**: Disciplined_Monk (Level 17 Monk, Warrior of the Elements)
- **Attack**: Unarmed Strike vs Aarakocra 1
- **Log entry**: `1d12+3 [Bludgeoning] + 3d6 [fire]: 11, 4, 2, 6 +3` → 26 damage applied
- The `3d6 [fire]` is from Elemental Strike (different feature), confirming the pipeline ran
- The base Unarmed Strike damage (`1d12+3`) remained Bludgeoning — Empowered Strikes did NOT trigger

## Root Cause Analysis
The `buildDamageTypeModifiersStep` in `src/services/combat/steps/attackRollPostDamage.js` (line 37-123) should trigger when:
1. `ctx.attack?.weaponType === 'unarmed'` ✓ (Unarmed Strike attack)
2. `!!ctx.playerStats.automation?.passives` ✓ (character has passives)
3. `ps.automation.passives.filter(a => a.type === 'damage_type_modifier' && a.trigger === 'unarmed_strike_hit')` returns non-empty array ✗

The filter at line 49 finds no matching passives, so the step returns early without showing a modal. The `damage_type_modifier` passive for Empowered Strikes is NOT being collected into `playerStats.automation.passives`.

## Investigation Points

### 1. Feature definition in class data
The feature IS defined in `public/data/2024/classes.json` at line 5965:
```json
{
  "name": "Empowered Strikes",
  "description": "Whenever you deal damage with your Unarmed Strike, it can deal Force damage or its normal damage type (your choice).",
  "level": 6,
  "type": "class_feature",
  "automation": {
    "type": "damage_type_modifier",
    "trigger": "unarmed_strike_hit",
    "weaponTypes": ["unarmed"],
    "options": [
      { "name": "Force", "damageType": "Force" },
      { "name": "Bludgeoning", "damageType": "Bludgeoning" }
    ],
    "casting_time": "passive"
  }
}
```

### 2. Automation routing
The `damage_type_modifier` type IS routed to `passives` in `automationRouter.js` (line 187-189):
```javascript
case 'damage_type_modifier':
    result.passives.push(info)
    result.specialActions.push(info)
```

### 3. Feature collection
The issue is likely in how `getActions()` populates the character's actions from class data. The Empowered Strikes feature may not be included in the `actions`/`bonusActions`/`reactions`/`specialActions` arrays that `collectAutomationFromFeatures()` processes.

The `collectAutomationFromFeatures()` function (line 170 of `rules.js`) collects from:
```javascript
const allFeatures = [
    ...playerStats.actions,
    ...playerStats.bonusActions,
    ...playerStats.reactions,
    ...playerStats.specialActions,
    ...playerStats.characterAdvancement,
];
```

If Empowered Strikes is not in any of these arrays, it won't be collected.

## Files Involved
- `src/services/combat/steps/attackRollPostDamage.js` — `buildDamageTypeModifiersStep` (line 37)
- `src/services/combat/automation/automationRouter.js` — routing for `damage_type_modifier` (line 187)
- `src/services/combat/automation/automationCollector.js` — `collectAutomationFromFeatures`
- `src/services/rules/rules.js` — `getPlayerStats` (line 103), `collectAutomationFromFeatures` call (line 170)
- `public/data/2024/classes.json` — Empowered Strikes definition (line 5965)
- `src/services/automation/handlers/combat/damageTypeModifierHandler.js` — handler for the feature

## Severity
Medium — The feature is defined in the data and routed correctly, but the automation never triggers during combat.
