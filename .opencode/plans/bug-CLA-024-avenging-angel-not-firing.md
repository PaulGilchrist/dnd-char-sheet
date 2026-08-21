# Bug: CLA-024 - Avenging Angel Automation Does Not Fire

## Overview

Clicking the "Avenging Angel" feature button on a level 20 Oath of Vengeance Paladin (2024 ruleset) character does not trigger the automation handler. The `avengingAngelActive` runtime value remains `null`/`undefined`, and no popup is displayed.

## Expected Behavior

When a level 20 Oath of Vengeance Paladin (2024 ruleset) clicks the "Avenging Angel" bonus action feature:

1. The `avengingAngelActive` runtime value should be set to `true`
2. The `avengingAngelRestUsed` runtime value should be set to `true`
3. An `activeBuffs` entry should be added: `{ name: "Avenging Angel", effect: "avenging_angel_flight", duration: "10_minutes", flySpeed: 60, hover: true }`
4. The `avengingAngelAuraTargets` array should be cleared to `[]`
5. A popup should display: "Avenging Angel activated! You gain Fly Speed 60 feet (hover) and your Aura of Protection gains a Frightful Aura. Enemies in the aura must succeed on a Wisdom saving throw or become Frightened for 1 minute or until taking damage."
6. If enemies are in combat and within the Aura of Protection range (30 ft), they should make WIS saves and receive the Frightened condition on failure

## Actual Behavior

Clicking the Avenging Angel feature button produces no observable effect:
- `avengingAngelActive` remains `null`/`undefined`
- `avengingAngelRestUsed` remains `null`/`undefined`
- `activeBuffs` remains empty
- No popup is displayed
- No network requests are made to update runtime state
- The handler is never invoked

## Steps to Reproduce

1. Navigate to the app at `http://localhost:80`
2. Select the "test-campaign"
3. Select the "AvengingAngelTest" character (Level 20 Oath of Vengeance Paladin, 2024 ruleset)
4. Click on the "Avenging Angel:" feature in the Bonus Actions section
5. Observe that:
   - No popup appears
   - The character's speed remains 30 ft (no fly speed added)
   - No "Avenging Angel" badge appears in the class features section
   - No runtime values are updated

## Likely Location

The handler and router are correctly registered:

- **Handler**: `src/services/combat/automation/handlers/class-cleric-paladin/avengingAngelHandler.js` - The `handle` function is correctly implemented and registered in `src/services/automation/index.js` at line 415 as `avenging_angel: handleAvengingAngel`
- **Router**: `src/services/combat/automation/routers/classFeatureRouter.js` (per manifest)
- **InfoBuilder**: `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` (per manifest)

The issue is likely in one of these areas:
1. The feature click handler in `src/components/char-sheet/CharBonusActions.jsx` (line 300-314) - the `hasAutomation(bonusAction)` check may not be passing
2. The `useCharActionsAutomation` hook (`src/components/char-sheet/useCharActionsAutomation.js`) - `executeHandler` may not be called
3. The feature data loading - the automation property may not be included in the bonusActions array passed to the component

## Notes

- The automation handler code itself appears correct (verified by manually setting runtime values via API)
- The 2024 class data at `public/data/2024/classes.json` line 7911-7925 correctly defines Avenging Angel with `"action": "bonus_action"` and `"casting_time": "1 bonus action"`
- The feature categorization in `src/services/character/featureCategorizationUtils.js` correctly includes `automation: item.automation` in the itemSummary (line 52)
- The feature IS rendered in the Bonus Actions section (visible in UI) and IS clickable (has cursor pointer)
- No network requests are made when clicking, suggesting `executeHandler` is never called
- This affects CLA-024 (Avenging Angel for Oath of Vengeance Paladin in 2024 ruleset)
