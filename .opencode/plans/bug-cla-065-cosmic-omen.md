# Bug: CLA-065 Cosmic Omen - Popup Not Displayed & Pending Bonus Not Set

## Overview
When clicking the "Cosmic Omen:" reaction on a Circle of the Stars Druid character sheet, the automation handler executes successfully (log entry is created) but:
1. No popup is displayed to the user showing the 1d6 roll result
2. The `cosmicOmenPendingBonus` runtime value is not set on the character

## Expected Behavior
1. Clicking "Cosmic Omen:" reaction should display a popup showing:
   - Star Map result (Weal/Woe, Even/Odd)
   - Star Map roll value
   - 1d6 roll result
   - Next d20 test modifier (e.g., "+2" or "-2")
2. `cosmicOmenPendingBonus` should be set on the character's runtime store with the roll value and type
3. `cosmicomenUses` should be decremented (if usesMax > 0)

## Actual Behavior
1. No popup appears - the handler result is returned but `handleAutomationReaction` doesn't display `automation_info` popups
2. `cosmicOmenPendingBonus` is NOT set on the character (e.g., `StarsDruid.cosmicOmenPendingBonus` remains null)
3. Campaign log entry IS created correctly (e.g., "StarsDruid used Cosmic Omen (Woe). Rolled 1d6: 2. Next d20 test modified -2.")
4. `cosmicomenUses` is NOT decremented (because `usesMax` is 0 for WIS modifier 0, the decrement block is skipped)

## Steps to Reproduce
1. Create a Circle of the Stars Druid (Level 6+) in a test campaign
2. Perform a Long Rest (triggers Cosmic Omen Star Map roll)
3. Navigate to the character sheet
4. Click on the "Cosmic Omen:" reaction name in the Reactions section
5. Observe: no popup appears, runtime data shows no `cosmicOmenPendingBonus`

## Likely Location
1. **`src/services/automation/handlers/class-sorcerer/cosmicOmenHandler.js:89`**: 
   - Uses literal `'cosmicOmen'` instead of `playerName` variable:
   ```javascript
   // BUG: should be `playerName` not `'cosmicOmen'`
   await setRuntimeValue('cosmicOmen', 'cosmicOmenPendingBonus', JSON.stringify({...}), campaignName);
   ```

2. **`src/components/char-sheet/CharReactions.jsx:230-234`**: 
   - Popup handling only checks for `eligibleSpells`, doesn't display `automation_info` popups:
   ```javascript
   if (result.type === 'popup') {
       if (result.payload.eligibleSpells && result.payload.eligibleSpells.length > 0) {
           setReactiveSpellEligible(result.payload.eligibleSpells);
       }
       return;  // <-- automation_info popups never displayed
   }
   ```

## Notes
- The handler IS registered correctly in `automation/index.js` (line 372: `handleCosmicOmen`)
- The reaction IS rendered correctly in the UI (verified via DOM inspection)
- The campaign log entry IS created correctly (confirms handler executes)
- The `usesMax` calculation returns 0 for WIS modifier 0, so uses decrement is skipped (this may be intentional - the feature says "minimum of once")
- The handler is in `class-sorcerer` folder but is a Druid feature (Circle of the Stars) - may need relocation
