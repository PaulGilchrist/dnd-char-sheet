# Bug: CLA-154 Greater Portent - 5e Wizard Portent Dice Not Refreshed on Long Rest

## Summary

The 5e ruleset Wizard Portent dice are NOT refreshed on long rest due to a mismatch between where the Portent automation is collected (`passives`) and where the long-rest handler checks for it (`specialActions`).

## Expected Behavior (from manifest CLA-154)

"Roll three d20s for Portent feature rather than two."

This implies:
- Portent (level 2): roll 2 d20s, refreshed on long rest
- Greater Portent (level 14): roll 3 d20s, refreshed on long rest

## Actual Behavior

The 5e ruleset Portent dice are **never refreshed on long rest**. The level check for 3 dice at level 14+ is correct, but the dice pool is never initialized/reset.

## Root Cause

### Data difference between rulesets

**5e ruleset** (`public/data/classes.json` line 13646-13656):
```json
{
  "name": "Portent",
  "level": 2,
  "automation": {
    "type": "passive_buff",
    "effect": "portent_d20_pool",
    "bonusExpression": "2d20"
  }
}
```

**2024 ruleset** (`public/data/2024/classes.json` line 13381-13388):
```json
{
  "name": "Portent",
  "level": 3,
  "automation": {
    "type": "portent",
    "effect": "portent",
    "casting_time": "passive"
  }
}
```

### Collection routing difference

1. **5e Portent** → `passiveHandlers.passive_buff` → `{ type: 'passive_buff', name: 'Portent', ... }` → router routes to `result.passives`
2. **2024 Portent** → `coreHandlers.portent` → `{ type: 'portent', name: 'Portent', ... }` → router routes to `result.specialActions`

### Long-rest check mismatch

`src/services/rules/effects/restRules-longRest.js` line 487-489:
```javascript
const hasPortent = (playerStats.automation?.specialActions ?? []).some(
  a => a.type === 'portent' || a.name === 'Portent'
)
```

This only checks `specialActions`. The 5e Portent feature is in `passives`, so `hasPortent` is always `false` for 5e Wizards. Portent dice are never refreshed.

### Greater Portent has no automation entry

Both 5e and 2024 rulesets have Greater Portent at level 14. The 5e version has **no automation field** (just description text). The 2024 version has `automation: { type: 'portent', ... }`. The level check `playerStats.level >= 14` in both `restRules-longRest.js` and `portentHandler.js` handles the 3-dice behavior independently.

## Evidence

### Test only covers 2024 behavior
`src/services/rules/effects/restRules-longRest.test.js` line 329:
```javascript
const stats = makeStats({ automation: { specialActions: [{ type: 'portent' }] } })
```

This test only covers the 2024 ruleset where Portent is in `specialActions`. No test covers the 5e case where Portent is in `passives`.

### Affected code locations

- `restRules-longRest.js:487-498` — long rest Portent dice refresh (broken for 5e)
- `portentHandler.js:221-229` — `refreshPortentDice` function (only used in tests)
- `automationInfoBuilder/passive.js:2` — `passiveHandlers.passive_buff` (5e routing)
- `automationInfoBuilder/core-handlers.js:561` — `coreHandlers.portent` (2024 routing)
- `automationRouter.js:145-161` — `passive_buff` → `passives`
- `automationRouter.js:626-628` — `portent` → `specialActions`

## Fix

Update the `hasPortent` check in `restRules-longRest.js` to also search `passives`:

```javascript
const hasPortent = (playerStats.automation?.specialActions ?? []).some(
  a => a.type === 'portent' || a.name === 'Portent'
) || (playerStats.automation?.passives ?? []).some(
  a => a.type === 'portent' || a.name === 'Portent'
)
```

Alternatively, fix the 5e ruleset Portent feature to use `type: 'portent'` instead of `type: 'passive_buff'` in `public/data/classes.json` for consistency with the 2024 ruleset.

## Impact

- **5e Wizard characters**: Portent dice are never refreshed on long rest. After using all initial portent dice, the feature becomes permanently unusable until manually reset.
- **2024 Wizard characters**: Not affected — Portent is correctly in `specialActions`.
- **Greater Portent**: The 3-dice level check works, but the underlying dice refresh issue prevents it from functioning for 5e Wizards.
