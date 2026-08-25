# Bug: CLA-140 — Fiendish Resilience resistance not applied to damage calculation

## Summary
Fiendish Resilience (Warlock level 10 class feature) stores the chosen damage type via `setChosenRuntimeValue` but the chosen resistance is never applied during damage calculation. The character gains no actual damage resistance despite the popup saying "You gain resistance to {type} damage."

## Expected Behavior (from manifest)
> "Choose one damage type (other than Force) when you finish a Short or Long Rest. Resistance to that type until you choose a different one."

## Actual Behavior
1. Player can trigger Fiendish Resilience and choose a damage type via modal
2. The handler stores the choice via `setChosenRuntimeValue` and marks `_fiendishResilienceUsed = true`
3. The popup correctly says "You gain resistance to {type} damage"
4. **BUG:** The chosen damage type is never added to the character's resistance list
5. Damage calculation does not halve damage for the chosen type

## Root Cause
The bug is in `src/services/combat/automation/automationPassives.js` — the `getDamageResistances` function (line 271-283) only checks for `passive_immunity` and `passive_buff` type passives:

```javascript
export function getDamageResistances(playerStats) {
    const passives = playerStats.automation?.passives || [];
    const resistances = [];
    for (const passive of passives) {
        if (passive.type === 'passive_immunity' && Array.isArray(passive.damageResistance)) {
            resistances.push(...passive.damageResistance);
        }
        if (passive.type === 'passive_buff' && Array.isArray(passive.resistances)) {
            resistances.push(...passive.resistances);
        }
    }
    return [...new Set(resistances)];
}
```

Fiendish Resilience is routed as a `damage_type_choice` type passive (see `automationRouter.js:546-551`):
```javascript
case 'damage_type_choice':
    if (info.effect === 'elemental_affinity') {
        result.specialActions.push(info)
    } else {
        result.passives.push(info)   // <-- Fiendish Resilience goes here
    }
    break
```

The passive looks like:
```json
{
    "type": "damage_type_choice",
    "name": "Fiendish Resilience",
    "damageTypes": [...],
    "effect": "fiendish_resilience",
    "casting_time": "passive",
    "hasAutomation": true
}
```

Since `getDamageResistances` doesn't handle `damage_type_choice` type passives, the stored chosen type is never extracted and added to the resistance list.

## Data Flow
1. `applyDamage.js:149-156` — reads `playerComputed.resistances` and calls `getDamageResistances`
2. `getDamageResistances` — only returns resistances from `passive_immunity` and `passive_buff` types
3. `damage_type_choice` with `effect: 'fiendish_resilience'` is never checked
4. Resistance never applied to damage calculation

## Handler Code Analysis
`fiendishResilienceHandler.js:78` — `applyTypeChoice` stores the chosen type:
```javascript
setChosenRuntimeValue(playerStats, name, chosenType, 'chosenType', campaignName);
```

But nothing adds the chosen type to the character's resistance data. The handler relies on `getDamageResistances` to read the stored choice, but it doesn't.

## Similar Pattern That Works
`hasIgnoreResistance` in `automationPassives.js:238-256` correctly checks `damage_type_choice` with `effect: 'elemental_adept'`:
```javascript
if (passive.type === 'damage_type_choice' && passive.effect === 'elemental_adept') {
    const chosenType = getChosenRuntimeValue(playerStats, passive.name, 'chosenType');
    if (chosenType && chosenType.toLowerCase() === String(damageType).toLowerCase()) {
        return true;
    }
}
```

This same pattern should be applied in `getDamageResistances` for `effect: 'fiendish_resilience'`.

## Fix
Add handling for `damage_type_choice` with `effect: 'fiendish_resilience'` in `getDamageResistances`:

```javascript
export function getDamageResistances(playerStats) {
    const passives = playerStats.automation?.passives || [];
    const resistances = [];
    for (const passive of passives) {
        if (passive.type === 'passive_immunity' && Array.isArray(passive.damageResistance)) {
            resistances.push(...passive.damageResistance);
        }
        if (passive.type === 'passive_buff' && Array.isArray(passive.resistances)) {
            resistances.push(...passive.resistances);
        }
        // NEW: Handle Fiendish Resilience damage_type_choice
        if (passive.type === 'damage_type_choice' && passive.effect === 'fiendish_resilience') {
            const chosenType = getChosenRuntimeValue(playerStats, passive.name, 'chosenType');
            if (chosenType) {
                resistances.push(chosenType);
            }
        }
    }
    return [...new Set(resistances)];
}
```

## Files to Modify
- `src/services/combat/automation/automationPassives.js` — add `damage_type_choice` / `fiendish_resilience` handling to `getDamageResistances`
- `src/services/combat/automation/automationPassives.test.js` — add tests for the new behavior

## Test Campaign: HexWarlock
- Level 10 Warlock (Great Old One) — should have Fiendish Resilience at level 10
- Currently has `"resistances": []` in character JSON
- After fix: should show resistance to chosen damage type in damage calculations
