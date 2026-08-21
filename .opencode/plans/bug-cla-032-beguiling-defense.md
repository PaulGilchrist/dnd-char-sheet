# Bug: CLA-032 - Beguiling Defenses Reaction Does Not Trigger

## Overview

The Beguiling Defenses reaction for the Warlock (Archfey Patron, 2024 rules) does not trigger when clicked, even after an attack has hit the warlock and `campaign.lastAttack` is correctly set. The handler returns no popup and the expected behavior (healing for half damage, Wisdom save prompt for attacker, Psychic damage on failed save) does not occur.

## Expected Behavior

1. Player clicks "Beguiling Defenses" reaction after being hit by an attack
2. Handler checks for recent attack against the player
3. If found, warlock heals for half the attack damage
4. Attacker is prompted to make a Wisdom save (DC based on CHA modifier)
5. On failed save, attacker takes Psychic damage equal to half the original damage
6. Popup displays attack details, healing amount, and save information

## Actual Behavior

1. Player clicks "Beguiling Defenses" reaction
2. Nothing happens - no popup, no healing, no save prompt
3. No console errors are logged
4. The handler is never invoked

## Steps to Reproduce

1. Open test-campaign and navigate to FeyWarlock character (2024 Warlock, Archfey Patron, Level 10)
2. Set campaign.lastAttack to simulate an attack hitting the warlock:
   ```
   POST /api/campaigns/test-campaign/lastAttack
   Body: { "value": { "attackEvent": { "timestamp": <now>, "targetName": "FeyWarlock", "damageTypes": ["Piercing"] }, "attackerName": "Aboleth 1", "targetName": "FeyWarlock", "primaryDamage": 20, "secondaryDamage": 0, "totalDamage": 20, "damageTypes": ["Piercing"], "hit": true, "actualDamage": 15, "damageApplied": true } }
   ```
3. Navigate to the Reactions section on the character sheet
4. Click on "Beguiling Defenses:" reaction button
5. Observe that no popup appears and no automation executes

## Likely Location

**Root cause**: The reaction object in `playerStats.reactions` lacks the `automation` property, causing `hasAutomation(reaction)` to return `false` in `CharReactions.jsx` line 629.

When `isClickable` is false, the `<b>` element is rendered without an `onClick` handler:

```jsx
// CharReactions.jsx:629-631
const isClickable = (reaction.details || reaction.name === OPPORTUNITY_ATTACK.name || reaction.name === 'Stand (Power Word Heal)' || hasAutomation(reaction)) && reaction.name !== 'Reactive Strike';
return <div key={reaction.name}>
    <b className={isClickable ? "clickable" : ""} onClick={() => isClickable && handleReactionClick(reaction)}>{reaction.name}:</b>
```

**Why the reaction lacks automation**: The character "FeyWarlock" has `class.major: null` in its JSON data. The 2024 rules engine's `getFeatures` function in `classRules2024.js` (lines 170-178) only loads subclass features when `playerStats.class.major` is present:

```javascript
if (playerStats.class.major) {
    const majorFeaturesList = playerStats.class.major.features?.filter(feature => feature.level <= playerStats.level) || [];
    const majorLevels = [{ features: majorFeaturesList }];
    const majorFeatures = addFeatures(majorLevels, featureCategories, { descriptionField: 'description' });
    features = mergeCategorizedFeatures(features, majorFeatures);
}
```

Since `major` is null, the Archfey Patron features (including "Beguiling Defenses" at level 10) are never loaded into `playerStats.reactions`.

**Data issue**: The character was created with `class.subclass: { name: "Archfey Patron" }` (5e format) instead of `class.major: { name: "Archfey Patron", features: [...] }` (2024 format). The 2024 rules engine expects the `major` format.

## Notes

- The "Beguiling Defenses" feature IS correctly defined in `public/data/2024/classes.json` with proper automation array containing both `passive_immunity` (charmed) and `beguiling_defenses` (reaction) entries
- The handler `beguilingDefensesHandler.js` is correctly registered in the automation index at line 432
- The `categorizeFeatures` function in `featureCategorizationUtils.js` correctly detects reaction automation from array-type automation entries (lines 58-80)
- The `featureCategories.js` file has "Beguiling Defenses" commented out in the `reactions` array (line 79), but this is not the primary issue since the feature has automation with `casting_time: "1 reaction"`
- The Charmed immunity IS working (shown as "Immunities: Charmed" in the character summary) because the `passive_immunity` automation is processed through `collectAutomationFromFeatures`
- Fix options: (1) Migrate existing character data to use `class.major` format, (2) Add fallback logic in `getFeatures` to also check `class.subclass` for 2024 rules, or (3) Populate `class.major` during character creation wizard for 2024 Warlock Archfey Patron
