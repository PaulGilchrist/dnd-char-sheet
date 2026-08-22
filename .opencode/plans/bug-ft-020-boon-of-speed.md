# Bug: FT-020 "Boon Of Speed" - Grappled Condition Not Removed

## Overview

The Boon of Speed feat (FT-020) includes the "Escape Artist" bonus action feature. When triggered, the handler correctly displays the popup message "You take the Disengage action and the Grappled condition ends on you." However, the Grappled condition is NOT actually removed from the character's active conditions. The character remains Grappled after using the feature.

## Expected Behavior

As a Bonus Action, the character should be able to take the Disengage action, which also ends the Grappled condition on them. After using Escape Artist, the Grappled condition badge should disappear from the character sheet.

## Actual Behavior

The popup message appears correctly, but the Grappled condition remains on the character. The condition badge ("Grappled DC 10") persists on the character sheet after the automation is triggered. The `activeConditions` runtime store value remains `["Grappled DC 10"]` instead of becoming `[]`.

## Steps to Reproduce

1. Navigate to "test-campaign" in the app
2. Open the "Boon Test" character (a level 20 Fighter with Battle Master subclass, 2024 ruleset, with Boon of Speed feat)
3. Confirm the character has the "Grappled DC 10" condition visible on the character sheet
4. Click on "Escape Artist:" in the Bonus Actions section
5. Observe the popup: "You take the Disengage action and the Grappled condition ends on you."
6. Dismiss the popup
7. Observe that the "Grappled DC 10" condition badge is STILL present on the character sheet
8. Verify in the runtime store (change-data) that `activeConditions` still contains `["Grappled DC 10"]`

## Likely Location

**File:** `src/services/automation/handlers/combat/bonusActionAttackHandler.js`
**Line:** 50

The filter condition at line 50 performs an exact match on the lowercase condition string:

```javascript
const filtered = conditions.filter(c => String(c).toLowerCase() !== 'grappled');
```

Conditions are stored with their DC suffix (e.g., `"Grappled DC 10"`). When lowercased, this becomes `"grappled dc 10"`, which does NOT equal `"grappled"`. Therefore the filter never removes the condition.

The fix should check if the condition STARTS WITH "grappled" rather than exact equality, e.g.:

```javascript
const filtered = conditions.filter(c => !String(c).toLowerCase().startsWith('grappled'));
```

## Notes

- The popup message IS displayed correctly, confirming the handler IS being invoked
- The `noOpportunityAttacks: true` property in the feat's automation definition (from `public/data/2024/feats.json` line 654) means the Disengage action should also prevent opportunity attacks, but this is not tested here
- The `additionalEffect: "end_grappled"` in the automation definition (line 653) is a separate effect that is NOT being processed by any handler — only the `effect: "disengage_end_grappled"` path is handled
- The existing unit tests in `src/services/automation/handlers/combat/bonusActionAttackHandler.test.js` (lines 427-485) test the `disengage_end_grappled` effect but use a condition stored as just `"Grappled"` (without DC), which would pass the exact-match filter. The tests don't cover the real-world case where conditions include DC values.
