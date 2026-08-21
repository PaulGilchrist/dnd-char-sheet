# Bug: CLA-010 Arcane Charge - Manifest and Implementation Issues

## Title
CLA-010 Arcane Charge: Manifest lists wrong class (Fighter vs Sorcerer), and implementation does not tie teleport to Action Surge timing (before/after additional action)

## Overview
The Arcane Charge automation (CLA-010) has multiple issues: the manifest incorrectly identifies the feature as belonging to Fighter, the implementation does not integrate with Action Surge, and the UI does not offer the "before or after the additional action" timing choice described in the expected behavior.

## Expected Behavior
Per `docs/automations-manifest.json`:
- Class: Fighter
- Expected: "When you use Action Surge, teleport up to 30 feet before or after the additional action."

Per actual game rules data:
- Arcane Charge is a **Sorcerer** level 15 feature (not Fighter)
- 5e description: "You gain the ability to teleport up to 30 feet to an unoccupied space you can see when you use your Action Surge. You can teleport before or after the additional action."
- 2024 description: "When you use Action Surge, teleport up to 30 feet before or after the additional action."

## Actual Behavior

### 1. Manifest class is wrong
`docs/automations-manifest.json` lists class as "Fighter" but Arcane Charge is a Sorcerer feature. The actual data is in:
- `public/data/classes.json` line 6285 (5e Sorcerer level 15)
- `public/data/2024/classes.json` line 5498 (2024 Sorcerer level 15)

### 2. No Action Surge integration
The handler at `src/services/automation/handlers/class-sorcerer/arcaneChargeHandler.js` implements `arcane_charge` as a standalone action type. It does NOT:
- Check if Action Surge was just used
- Trigger as part of the Action Surge flow
- Have any relationship to the `extra_action` (Action Surge) handler

### 3. No before/after timing choice
The modal at `src/components/char-sheet/modals/arcane/ArcaneChargeModal.jsx` only shows:
- "Teleport up to {distance} to an unoccupied space you can see."
- A single "Teleport" button
- No option to choose "before" or "after" the additional action

### 4. Handler is correctly wired but standalone
- Handler registered: `src/services/automation/index.js` line 389: `arcane_charge: handleArcaneCharge`
- Router: `src/services/combat/automation/automationRouter.js` line 278-281: adds to `result.actions` (doubled)
- Modal wired: `src/components/char-sheet/useCharActionsAutomation.js` line 57
- Modal rendered: `src/components/char-sheet/CharActionModals.SecondaryModals.jsx` line 256-259
- Info builder: `src/services/combat/automation/automationInfoBuilder/spell.js` line 139-142
- Tests pass: `src/services/automation/handlers/class-sorcerer/arcaneChargeHandler.test.js`

## Steps to Reproduce
1. Create a 2024 Sorcerer character at level 15+
2. Check the character's features - Arcane Charge should appear as a level 15 feature
3. Use Action Surge - Arcane Charge does NOT trigger or appear as part of the Action Surge flow
4. The Arcane Charge feature appears as a separate action, not tied to Action Surge
5. No "before/after" timing choice is presented in the modal

## Likely Location
1. **Manifest fix**: `docs/automations-manifest.json` - change class from "Fighter" to "Sorcerer"
2. **Handler enhancement**: `src/services/automation/handlers/class-sorcerer/arcaneChargeHandler.js` - needs integration with Action Surge flow
3. **Modal enhancement**: `src/components/char-sheet/modals/arcane/ArcaneChargeModal.jsx` - needs before/after timing picker
4. **Automation pipeline**: The `extra_action` handler (`src/services/automation/handlers/combat/extraActionHandler.js`) may need to emit an event that Arcane Charge can respond to

## Notes
- The handler and modal code exist and are tested, but the integration with Action Surge is missing
- The feature data in both 5e and 2024 classes.json correctly describes the Action Surge timing relationship, but the automation implementation does not enforce it
- The manifest file has an incorrect class assignment that needs to be corrected
