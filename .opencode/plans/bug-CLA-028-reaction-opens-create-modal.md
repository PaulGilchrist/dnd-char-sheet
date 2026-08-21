# Bug: CLA-028 Bastion of Law — Reaction opens CREATE modal instead of SPEND modal

## Overview

When verifying automation CLA-028 (Bastion of Law), the ward creation flow works correctly, but clicking the Bastion of Law reaction in the Reactions section opens the CREATE ward modal instead of the SPEND dice modal. This prevents the damage reduction flow from working.

## Expected Behavior

Per the manifest:
> "Action, expend 1-5 Sorcery Points to create magical ward around self or creature within 30 feet. Ward represented by number of d8s equal to SP spent. When warded creature takes damage, can expend dice, roll them, reduce damage by total rolled. Ward lasts until Long Rest or use again."

Specifically:
1. Clicking Bastion of Law **action** should open CREATE ward modal (target selection + SP spinner)
2. Clicking Bastion of Law **reaction** (when ward is active) should open SPEND dice modal (choose how many d8 to roll against incoming damage)

## Actual Behavior

- Step 1 (CREATE): ✅ Works correctly — clicking the action opens the CREATE ward modal
- Step 2 (SPEND): ❌ Broken — clicking the reaction opens the CREATE ward modal instead of the SPEND dice modal

When the Bastion of Law reaction is clicked, the console shows:
```
[bastionOfLaw] handleCreateWard {canCreateWard: true, spAmount: 1, selectedTarget: ClockworkSorcererTest}
[bastionOfLaw] handleApply called {playerName: ClockworkSorcererTest, spAmount: 1, targetName: ClockworkSorcererTest, campaignName: test-campaign}
[bastionOfLaw] onConfirm result undefined
```

This indicates `handleCreateWard` (from `BastionOfLawModal.jsx`) was invoked instead of `handleSpendDice`. The CREATE ward modal appears with target selection and SP spinner, rather than the SPEND dice modal which should show dice count selection.

## Steps to Reproduce

1. Create/load a 2024 Clockwork Sorcerer at level 6 (has Bastion of Law feature)
2. Set `selectedAllies` runtime value to include a creature in initiative (e.g., `["Test Skeleton"]`)
3. Navigate to the character sheet
4. Click "Bastion of Law:" in the Actions section
5. Select target (self), click "Create Ward (1d8)" — ward is created successfully
6. Verify ward is active: `bastionOfLawActive: true`, `bastionOfLawWardDice: ["1d8"]`
7. Verify Bastion of Law reaction appears in Reactions section
8. Set `lastAttack` runtime value with `targetName: "ClockworkSorcererTest"`
9. **Click the Bastion of Law reaction** in Reactions section
10. **Bug**: CREATE ward modal appears instead of SPEND dice modal

## Likely Location

The routing issue is likely in one of these areas:

1. **`src/services/automation/index.js`** (line 457) — `HANDLER_MAP['bastion_of_law_spend']` maps to `handleBastionOfLawSpend`, which should return `modalName: 'bastionOfLawSpend'`. Verify this handler is being called (not `handleBastionOfLaw`).

2. **`src/components/char-sheet/CharReactions.jsx`** (lines 102-110) — The reaction is added with `automation: { type: 'bastion_of_law_spend' }`. Verify this type is preserved when the reaction is clicked and passed to `executeHandler`.

3. **`src/components/char-sheet/CharReactions.jsx`** (lines 224-249) — The modal name routing checks for `result.modalName === 'bastionOfLawSpend'` to set `bastionOfLawSpendModal`. If `handleBastionOfLawSpend` returns a different modal name, it falls through to the default popup path.

4. **`src/services/automation/handlers/class-cleric-paladin/bastionOfLawHandler.js`** (lines 129-178) — The `handleSpendDice` function should return `{ type: 'modal', modalName: 'bastionOfLawSpend', ... }` when `numDice` is not specified.

## Notes

- The ward creation flow (action → CREATE modal → apply) works correctly:
  - SP is deducted (6→5)
  - `bastionOfLawActive: true`
  - `bastionOfLawWardDice: ["1d8"]`
  - `bastionOfLawWardSource: "ClockworkSorcererTest"`
  - `bastionOfLawWardUsed: 0`
  - `bastionOfLawLastAttackDamage: 0`
  - Reaction appears in Reactions section with correct description
  - Log entry is created with correct description

- The `handleSpendDice` function at `bastionOfLawHandler.js:129` correctly returns `modalName: 'bastionOfLawSpend'` when `numDice` is null/undefined.

- The `BastionOfLawSpendModal` component exists at `src/components/char-sheet/modals/divine/BastionOfLawSpendModal.jsx` and is rendered in `CharReactions.jsx` line 555-563.

- Test character used: `ClockworkSorcererTest.json` (Human, Sorcerer level 6, Clockwork Sorcery subclass, 2024 rules)
