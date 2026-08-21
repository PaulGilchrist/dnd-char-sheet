# Bug: CLA-013 Archdruid Evergreen Wild Shape Never Fires

## Overview

The Archdruid's "Evergreen Wild Shape" class feature automation never triggers when rolling initiative with zero Wild Shape uses. The `initiative_action` automation type is routed to `automation.specialActions` by the automation router, but `useInitiativeEffects` checks `automation.actions` for the presence of the effect.

## Expected Behavior

When a level 20 Druid with the Archdruid feature rolls initiative and has 0 Wild Shape uses, the runtime value `wildShapeUses` should be set to 1. The `useInitiativeEffects` hook should detect the `wild_shape_regen_on_initiative` effect and apply the recovery.

## Actual Behavior

The `wildShapeUses` runtime value remains unchanged (stays at 0). The Evergreen Wild Shape recovery never fires because the automation entry is stored in the wrong array.

## Steps to Reproduce

1. Create a level 20 Druid (2024 rules) with Circle of the Moon subclass (Archdruid feature at level 20)
2. Set `wildShapeUses` runtime value to 0
3. Navigate to the character sheet for the Druid
4. Dispatch an `initiative-rolled` event with `characterName: 'DruidName'`
5. Observe that `wildShapeUses` remains 0 instead of becoming 1

## Likely Location

**Root cause:** `src/services/combat/automation/automationRouter.js` line 135-136

The `routeAutomation` function routes `initiative_action` type to `specialActions`:
```js
case 'initiative_action':
    result.specialActions.push(info)
    break
```

**Consumer that doesn't find it:** `src/components/char-sheet/useInitiativeEffects.js` line 417

The hook checks `automation.actions` but the automation is in `specialActions`:
```js
const hasEvergreen = (playerStats.automation?.actions ?? []).some(
    a => a.type === 'initiative_action' && a.effect === 'wild_shape_regen_on_initiative'
);
```

**Feature definition:** `public/data/2024/classes.json` lines 3838-3847

The "Evergreen Wild Shape" sub-feature has the correct automation metadata:
```json
{
    "name": "Evergreen Wild Shape",
    "automation": {
        "type": "initiative_action",
        "effect": "wild_shape_regen_on_initiative",
        "resourceKey": "wildShapeUses",
        "casting_time": "passive"
    }
}
```

## Notes

- The fix should be in `automationRouter.js`: change `result.specialActions.push(info)` to `result.actions.push(info)` for the `initiative_action` case, OR
- The fix could be in `useInitiativeEffects.js`: change the check to look in `automation.specialActions` instead of `automation.actions`
- The first approach (fixing the router) is preferred since `initiative_action` semantically belongs in `actions` and other code may expect it there
- CLA-014 (duplicate Archdruid manifest entry) has the same bug since it uses the same handler/router
