# Bug: CLA-035 Bend Fate - Feature in Wrong Sorcerer Subclass

## Overview
"Bend Fate" is defined in `public/data/2024/classes.json` under "Wild Magic Sorcery" but should be under "Clockwork Sorcery" (the 2024 equivalent of Clockwork Soul). Clockwork Sorcerer characters do not display "Bend Fate" as a feature because the feature is not in their subclass feature list.

## Expected Behavior
A Level 6+ Clockwork Sorcerer should display "Bend Fate" in the Reactions section with the text: "Immediately after another creature you can see rolls the d20 for a D20 Test, take Reaction and spend 1 Sorcery Point to roll 1d4 and apply as bonus or penalty (your choice) to the d20 roll."

## Actual Behavior
Clockwork Sorcerer characters show no "Bend Fate" feature. The Reactions section only shows "Restore Balance" and "Opportunity Attack". The feature exists in the data file but under the wrong subclass (Wild Magic Sorcery instead of Clockwork Sorcery).

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create a new Human Sorcerer (Clockwork Sorcery) Level 6 character
4. View the character sheet Reactions section
5. Observe that "Bend Fate" is not listed
6. Check `public/data/2024/classes.json` — "Bend Fate" is under "Wild Magic Sorcery" instead of "Clockwork Sorcery"

## Likely Location
- `public/data/2024/classes.json` — "Bend Fate" is under "Wild Magic Sorcery" (line ~11366), needs to be moved to "Clockwork Sorcery"
- Character creation wizard may also need to populate `class.subclass.features` from class data

## Notes
- The feature definition itself is correct (name, description, level 6, automation type "reaction_bonus")
- Clockwork Sorcery subclass features in JSON are: Clockwork Spells (L3), Restore Balance (L3), Bastion of Law (L6), Trance of Order (L14), Clockwork Cavalcade (L18)
- "Bend Fate" should be added to Clockwork Sorcery features alongside Bastion of Law
