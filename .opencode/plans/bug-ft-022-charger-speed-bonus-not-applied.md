# Bug: FT-022 Charger - Speed Bonus Not Applied Due to Missing effect Field

## Overview
The Charger feat's speed bonus (+10 ft when taking Dash action) is not displayed on the character sheet because the temp buff created by `buffHandler.js` lacks an `effect` field. The `charSummaryCalc.js` only applies speed bonuses when `buff.effect === 'speed_boost'`, but the Charger buff has no `effect` field.

## Expected Behavior
When a character with the Charger feat takes the Dash action, their displayed Speed should increase by 10 feet for that action. The character sheet should show the increased speed.

## Actual Behavior
The Charger feat's popup message displays correctly ("Speed increases by 10 feet"), but the character's Speed UI does not reflect the +10 ft increase. The temp buff is added to `activeBuffs` but is never applied to the speed calculation.

## Steps to Reproduce
1. Open app at localhost
2. Navigate to "test-campaign"
3. Create a 2024 character with the Charger feat equipped
4. Take the Dash action
5. Observe that the popup confirms the speed increase but the character sheet Speed display does not change

## Likely Location
- `src/services/automation/handlers/buffs/buffHandler.js:40` — Charger buff created as `{ name: 'Charger', tempBuff: true, speedBonus: 10, duration: 'same_action' }` — missing `effect: 'speed_boost'` field
- `src/services/rules/core/charSummaryCalc.js:231` — Only applies speed bonuses when `buff.effect === 'speed_boost'`

## Notes
- The feat definition in `public/data/2024/feats.json` correctly specifies `effect: "speed_bonus"` 
- The automation routing correctly maps `temp_buff` → `specialActions`
- The handler correctly parses the bonus and adds it to `activeBuffs`
- The fix is likely to add `effect: 'speed_boost'` to the buff object in buffHandler.js, or update charSummaryCalc.js to also check for `buff.speedBonus`
