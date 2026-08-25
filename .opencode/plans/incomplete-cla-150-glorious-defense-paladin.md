# INCOMPLETE: CLA-150 Glorious Defense Verification

## Summary
Verification of CLA-150 (Glorious Defense) automation is **INCOMPLETE** because the NPC attack could not be triggered from the UI.

## What Was Completed

### Character Setup
- **ElderPaladin** was updated from "Oath of the Ancients" to "Oath of Glory" subclass
- Character is now correctly showing as "Paladin (oath of glory), Level 20"
- **Glorious Defense** reaction button appears in the Reactions section
- **Glorious Defense Uses:** 1/1 is displayed in the tracked resources
- Charisma modifier is -1, so AC bonus = Math.max(1, -1) = 1

### Encounter Setup
- **Aarakocra Aeromancer** was added via Encounter Builder
- Encounter was saved and joined
- Initiative tracker shows Aarakocra Aeromancer 1 at top with initiative 12
- Target was set to ElderPaladin
- Combat summary exists in runtime state with correct creature data

### Code Analysis
- **Handler:** `gloriousDefenseHandler.js` - correctly implements the feature logic
  - Reads last attack from campaign
  - Adds CHA modifier to target's AC (minimum +1)
  - If attack misses, rolls back damage and triggers counterattack
  - Decrements uses on successful activation
- **InfoBuilder:** `reaction.js` - correctly builds reaction info with acBonus
- **Router:** `automationRouter.js` - correctly routes to reactions list
- **hasGloriousDefenseActive:** Checks for Paladin class with "Oath of Glory" subclass

## Blocker: NPC Attack Trigger

The initiative tracker's creature card for runtime encounter creatures does not open the monster stat block modal when clicked. The `initiative-npc-click-handler.jsx` has a fallback to `getMonsterData()` for runtime creatures, but clicking the NPC avatar does not trigger the modal.

The creature card HTML shows only:
- Remove NPC button
- NPC avatar (clickable, but doesn't open modal for runtime creatures)
- Creature name, HP, Initiative, Target select, Add button

There are **no attack buttons** visible in the initiative tracker for NPC creatures. The NPC attack must be triggered from the monster stat block modal (MonsterCardModal), which contains the attack actions, but this modal is not opening.

## What Needs to Happen

1. Fix the NPC click handler so that clicking on a runtime encounter creature opens the monster stat block modal with attack options
2. Once the modal opens, click the Wind Staff attack to trigger an attack against ElderPaladin
3. Click the Glorious Defense reaction button in the ElderPaladin's CharReactions section
4. Verify the reaction applies the CHA modifier AC bonus and handles the attack result correctly

## Files Modified
- `public/campaigns/test-campaign/ElderPaladin.json` - Changed subclass from "Oath of the Ancients" to "Oath of Glory"
