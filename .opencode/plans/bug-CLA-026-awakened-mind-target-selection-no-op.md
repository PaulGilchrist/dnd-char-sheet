# Bug: CLA-026 Awakened Mind - Target Selection Does Not Execute Automation

## Overview

When a player clicks "Awakened Mind" in the Bonus Actions section, a target selection modal appears showing available creatures. After selecting a target and clicking "Establish Link", the modal closes but **the automation never fires**. No buff is applied, no `awakenedMindTarget` is set, no log entry is created, and no confirmation popup is shown.

## Expected Behavior

1. Player clicks "Awakened Mind" bonus action
2. Target selection modal appears with creature list
3. Player selects a target (e.g., "Test Goblin") and clicks "Establish Link"
4. The `confirmTelepathicSpeech` function from `buffHandler.js` should be called with the selected target
5. Expected results:
   - A buff named "Awakened Mind" with `effect: "telepathic_speech"` is added to `activeBuffs`
   - `awakenedMindTarget` runtime value is set to the selected creature name
   - An expiration is registered to remove the buff after duration (Warlock level in minutes)
   - A log entry is created: "AwakenedMindTest activated Awakened Mind with {target} for {miles} mile(s) (duration: {minutes} minute(s))"
   - A popup confirmation shows: "Awakened Mind activated with {target} ({miles} mile(s), {minutes} minute(s) duration)"
   - Feature description correctly shows: "Range: 3 mile(s) | Duration: 3 minute(s)" (CHA +3 mod = 3 miles, level 3 = 3 minutes)

## Actual Behavior

1. Player clicks "Awakened Mind" bonus action
2. Target selection modal appears with creature list
3. Player selects a target and clicks "Establish Link"
4. The modal closes immediately
5. **No buff is added to `activeBuffs`** (array remains empty `[]`)
6. **No `awakenedMindTarget` runtime value is set**
7. **No log entry is created**
8. **No popup confirmation is shown**

## Steps to Reproduce

1. Navigate to test-campaign
2. Select the "AwakenedMindTest" character (Level 3 Warlock, Great Old One Patron, Charisma 16)
3. Click "Awakened Mind:" in the Bonus Actions section
4. Select "Test Goblin" from the target list
5. Click "Establish Link"
6. Observe that the modal closes with no confirmation
7. Check the character JSON (`/api/campaigns/test-campaign/AwakenedMindTest.json`) — `activeBuffs` is `[]` and no `awakenedMindTarget` property exists

## Likely Location

**Root cause:** `src/services/combat/automation/routers/classFeatureRouter.js` (per manifest) or more specifically `src/components/char-sheet/useCharActionsAutomation.js` lines 112-129.

The `telepathicSpeech` handler in `useCharActionsAutomation.js` sets up a `secondaryTargetModal` but the `onTargetSelected` callback (line 122-124) only clears the modal:

```js
telepathicSpeech: (payload) => {
    // ...
    onTargetSelected: async (_targetName) => {
        setModalState({ secondaryTargetModal: null });  // <-- BUG: doesn't call confirmTelepathicSpeech
    },
    // ...
}
```

The `confirmTelepathicSpeech` function exists in `src/services/automation/handlers/buffs/buffHandler.js` (lines 480-531) and is the correct function to call with the selected target. It:
- Calls `toggleBuff()` to add/remove the buff
- Sets `awakenedMindTarget` runtime value
- Registers expiration for the buff
- Creates a log entry
- Returns a confirmation popup

The handler should import `confirmTelepathicSpeech` from `buffHandler.js` and call it with the action, playerStats, campaignName, and selected target name.

## Notes

- The modal correctly displays feature metadata: "Range: 3 mile(s) | Duration: 3 minute(s)" (derived from CHA modifier and level in the handler at line 121)
- The `confirmTelepathicSpeech` function correctly calculates miles as `Math.max(1, chaMod)` and duration as `playerStats.level`
- The `toggleBuff` function correctly adds the buff with `effect: "telepathic_speech"` and `duration: "warlock_level_minutes"`
- The `awakenedMindTarget` runtime value is used by `clairvoyantCombatantHandler.js` to get the telepathic bond target for the Clairvoyant Combatant feature (CLA-027)
- This bug affects both "Awakened Mind" and "Telepathic Speech" features since they share the same handler path
