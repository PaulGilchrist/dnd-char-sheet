# Bug: CLA-014 Archdruid - Evergreen Wild Shape Never Fires

## Overview

The Evergreen Wild Shape automation (CLA-014) for the Archdruid class feature never triggers when the character rolls initiative with 0 Wild Shape uses remaining. The automation info is routed to `specialActions` by the router, but `useInitiativeEffects` checks `automation.actions` instead of `automation.specialActions`.

## Expected Behavior

When a Level 20 Druid (Circle of the Moon) with the Archdruid feature rolls initiative and has `wildShapeUses` at 0, the Evergreen Wild Shape feature should trigger and restore 1 Wild Shape use. The Wild Shape Uses display should change from `0/4` to `1/4` after the initiative roll.

## Actual Behavior

The Wild Shape Uses remain at `0/4` after rolling initiative. No automation popup appears, and no runtime value change occurs.

## Steps to Reproduce

1. Load the "test-campaign" campaign
2. Select the "ArchdruidTest" character (Level 20 Druid, Circle of the Moon, 2024 rules)
3. Verify Wild Shape Uses shows `0/4 (cur/max)`
4. Navigate to the Initiative tab and ensure ArchdruidTest is in the initiative list
5. Roll initiative for ArchdruidTest (click the initiative spinbutton)
6. Observe that Wild Shape Uses remains `0/4` instead of changing to `1/4`

## Likely Location

**Root Cause:** Mismatch between where the automation is routed and where it is checked.

- `src/services/combat/automation/automationRouter.js:135-136` — `initiative_action` type is routed to `result.specialActions.push(info)`
- `src/components/char-sheet/useInitiativeEffects.js:417` — Checks `playerStats.automation?.actions` instead of `playerStats.automation?.specialActions`

```javascript
// useInitiativeEffects.js:417 - BUG: checks .actions but router puts it in .specialActions
const hasEvergreen = (playerStats.automation?.actions ?? []).some(
    a => a.type === 'initiative_action' && a.effect === 'wild_shape_regen_on_initiative'
);
```

The fix is to change line 417 to check `.specialActions` instead of `.actions`:

```javascript
const hasEvergreen = (playerStats.automation?.specialActions ?? []).some(
    a => a.type === 'initiative_action' && a.effect === 'wild_shape_regen_on_initiative'
);
```

## Notes

- The test character `ArchdruidTest.json` is correctly configured with the Evergreen Wild Shape feature containing the proper automation metadata (`type: "initiative_action"`, `effect: "wild_shape_regen_on_initiative"`)
- The `wildShapeUses` runtime value is correctly initialized to `0` in the character JSON
- The `routeAutomation` function correctly places `initiative_action` in `specialActions` (line 136 of automationRouter.js)
- The `useInitiativeEffects` hook's check at line 417 is the only place that looks in `.actions` for this effect type
- Other similar checks in the same hook (e.g., Superior Inspiration at line 430) also check `.actions`, which may have the same bug if any other `initiative_action` effects use `casting_time: "passive"`
