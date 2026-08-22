# Bug: CLA-008 Aquatic Affinity - Missing Circle of the Sea Features

## Overview
Circle of the Sea Druid characters do not display "Aquatic Affinity" or any Circle of the Sea subclass features on their character sheet. The expected features (Emanation size increase for Wrath of the Sea, Swim Speed) are completely missing.

## Expected Behavior
A Level 1+ Circle of the Sea Druid should display "Aquatic Affinity" as a feature with the text: "The size of the Emanation created by your Wrath of the Sea increases to 10 feet. In addition, you gain a Swim Speed equal to your Speed."

## Actual Behavior
The character sheet shows only: Resourceful (Human), Primal Order (Druid), Tavern Brawler (feat). No Circle of the Sea subclass features appear. Searching for "Aquatic", "Affinity", "Swim", "Emanation", "Wrath", or "Circle" yields no matches for subclass features.

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create a new Level 1 Human Druid (Circle of the Sea) character named "SeaDruidTest"
4. View the character sheet
5. Observe that only Resourceful, Primal Order, and Tavern Brawler are displayed
6. Search for "Aquatic", "Swim", "Emanation" — no results

## Likely Location
- `public/data/2024/classes.json` - Circle of the Sea subclass definition (check if Aquatic Affinity feature is defined)
- `src/services/character/featureCategories.js` - Feature categorization logic (check if Circle of the Sea features are properly categorized)
- Character sheet rendering components that display subclass features

## Notes
- The Druid class is correctly selected as Circle of the Sea in the character data
- Other Druid subclass features (Primal Order) are displayed correctly
- The issue appears specific to Circle of the Sea subclass features not being rendered or defined
