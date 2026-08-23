# Bug: CLA-010 Arcane Charge - No Actual Teleportation

## Overview

The Arcane Charge automation (CLA-010) for Fighter (Eldritch Knight) level 15 in the 2024 ruleset does not actually teleport the character. The handler returns a modal that shows a "Teleport" button, but when confirmed, it only displays an info popup stating "Teleported X ft to an unoccupied space you can see" without performing any actual position update on the map.

## Expected Behavior

"When you use Action Surge, teleport up to 30 feet before or after the additional action."

The character's position on the map should be updated to a new unoccupied space within 30 feet after confirming the Arcane Charge teleport.

## Actual Behavior

1. The Arcane Charge feature is defined in the character data (Fighter Eldritch Knight level 15, 2024 ruleset)
2. The handler (`arcaneChargeHandler.js`) returns a modal with type `'modal'` and `modalName: 'arcaneCharge'`
3. The modal (`ArcaneChargeModal.jsx`) displays: "Teleport up to X ft to an unoccupied space you can see." with a "Teleport" button
4. When the Teleport button is clicked, `confirmArcaneCharge` is called
5. `confirmArcaneCharge` returns a popup with `type: 'automation_info'` and description: "Arcane Charge: Teleported X ft to an unoccupied space you can see."
6. **The character's position is never updated** - no map movement occurs, no position data is written to the character state

Additionally, the feature actions (Action Surge, Arcane Charge, War Magic) are rendered as informational text below the actions table on the character sheet, not as clickable actions. They cannot be triggered from the character sheet UI.

## Steps to Reproduce

1. Navigate to test-campaign in the app
2. Create a new character: 2024 ruleset, Human, Soldier background, Fighter class, Eldritch Knight subclass, level 15
3. Verify the character has the Arcane Charge feature (listed in Actions section)
4. The Arcane Charge feature text is not clickable - clicking it does nothing
5. Even if the modal could be triggered (e.g., during combat), the confirm handler only shows a popup without updating character position

## Likely Location

- Handler: `src/services/automation/handlers/class-sorcerer/arcaneChargeHandler.js` - `handle()` returns modal, `confirmArcaneCharge()` returns info popup with no position update logic
- Modal: `src/components/char-sheet/modals/arcane/ArcaneChargeModal.jsx` - No map interaction or position selection
- Data definition: `public/data/2024/classes.json` line 5498 - Arcane Charge feature with `automation.type: "arcane_charge"`
- Router: `src/services/combat/automation/automationRouter.js` line 278-281 - adds arcane_charge to actions list (pushed twice)
- InfoBuilder: `src/services/combat/automation/automationInfoBuilder/spell.js` line 139-148 - creates action info with distance

## Notes

- The manifest lists this as a Fighter class feature, but the handler is located in `class-sorcerer/` folder (likely a misnomer in the folder structure)
- The handler and confirm functions take `_playerStats` and `_campaignName` parameters but never use them
- No code exists to update character position on the map - the teleportation is purely cosmetic
- The modal does not prompt the user to select a destination position on the map
- The automation is designed as a passive feature that appears in the actions list, but the feature actions are rendered as informational text on the character sheet, not as clickable actions
- The unit tests (`arcaneChargeHandler.test.js`) only verify the modal/popup return values, not actual teleportation behavior
