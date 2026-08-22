# Bug: CLA-040 Body and Mind - Filtered Out by featuresToIgnore

## Overview
"Body and Mind" is a level 20 Monk class feature defined in `public/data/2024/classes.json` but is filtered out from the character sheet UI because it appears in the `featuresToIgnore` list in `src/services/character/featureCategories.js`.

## Expected Behavior
A Level 20+ 2024 Monk should display "Body and Mind" as a feature with the text: "Your Dexterity and Wisdom scores increase by 4, to a maximum of 25."

## Actual Behavior
The "Body and Mind" feature does not appear on the character sheet. It is filtered out by the `featuresToIgnore` list in `src/services/character/featureCategories.js:142`. The feature is defined in the data file and registered in the automation manifest (CLA-040) but is invisible to players.

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create a new Level 20 2024 Monk character
4. View the character sheet
5. Observe that "Body and Mind" is not displayed in any section
6. Check `src/services/character/featureCategories.js:142` — "Body and Mind" is in the `featuresToIgnore` array

## Likely Location
- `src/services/character/featureCategories.js:142` — "Body and Mind" is in `featuresToIgnore` array, needs to be removed
- `public/data/2024/classes.json` — Feature is correctly defined at Monk level 20

## Notes
- The feature is correctly defined in the data file with `type: "ability_score_increase"`, `ability_scores: {dex: 4, wis: 4}`, `maxScore: 25`
- The `featuresToIgnore` list is meant to exclude features that don't need UI display (like passive racial traits), but Body and Mind is a significant class feature that should be visible
- This affects both the UI display and potentially the ability score calculation if the feature's automation is not being applied
