# CLA-132 Fast Hands - INCOMPLETE

## Summary
Verification of the Fast Hands classFeature automation (CLA-132) is **INCOMPLETE** because VenomStrike (the test character) does not have the Fast Hands feature available.

## Character Analysis
- **Character**: VenomStrike
- **Ruleset**: 2024
- **Class**: Rogue (Assassin subclass)
- **Level**: 13

## Why Fast Hands is Not Available
In the 2024 rules data (`public/data/2024/classes.json`), Fast Hands is defined as a **Thief subclass** feature (Major 3, level 3), NOT a base Rogue feature:

```json
// public/data/2024/classes.json - Rogue.majors[3] (Thief)
{
  "name": "Fast Hands",
  "level": 3,
  "type": "class_feature",
  "automation": {
    "type": "fast_hands",
    "options": [...],
    "casting_time": "1 bonus action"
  }
}
```

VenomStrike is an **Assassin** (Major 1), not a Thief. The Assassin subclass features are:
- Assassinate (level 3)
- Assassin's Tools (level 3)
- Infiltration Expertise (level 9)
- Envenom Weapons (level 13)
- Death Strike (level 17)

## Code Verification (PASSED)
The automation code itself is correctly implemented:

1. **Handler**: `src/services/automation/handlers/class-fighter-rogue/fastHandsHandler.js` - correctly implements `handle()` (returns bonusActionChoice modal) and `applyFastHands()` (logs and shows popup)
2. **Routing**: `src/services/combat/automation/automationRouter.js:501-503` - `fast_hands` → bonusActions
3. **Info Builder**: `src/services/combat/automation/automationInfoBuilder/core-handlers.js:362-371` - correctly builds info for `fast_hands` type
4. **Handler Registration**: `src/services/automation/index.js:143,451` - imported and registered in HANDLER_MAP

## Data Issue (BLOCKER)
Fast Hands should be a **base Rogue feature** at level 2 in both 5e and 2024 D&D rules. It is incorrectly placed as a Thief subclass feature in the 2024 data. This means:
- All non-Thief Rogues (Assassin, Soulknife, Arcane Trickster) do NOT get Fast Hands
- The feature must be moved from `rogue.majors[3].features[0]` (Thief) to `rogue.class_levels[1].features` (level 2)

## Manifest Issue
The manifest (`docs/automations-manifest.json`) references non-existent paths:
- `src/services/combat/automation/handlers/classFeatureHandler.js` (does not exist)
- `src/services/combat/automation/routers/classFeatureRouter.js` (does not exist)
- `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` (does not exist)

The actual paths are:
- Handler: `src/services/automation/handlers/class-fighter-rogue/fastHandsHandler.js`
- Router: `src/services/combat/automation/automationRouter.js` (unified router)
- Info Builder: `src/services/combat/automation/automationInfoBuilder/core-handlers.js`

## Next Steps to Complete Verification
1. Fix the 2024 class data to make Fast Hands a base Rogue feature (level 2)
2. Create a Thief subclass character or change VenomStrike's subclass to Thief
3. Clear server cache (10s debounce)
4. Verify Fast Hands appears in Bonus Actions section
5. Click Fast Hands bonus action, select an option (Sleight of Hand / Thieves' Tools / Use an Object)
6. Verify the popup shows the correct description

## VERIFICATION COMPLETE (2026-08-28)

Character was edited (`public/campaigns/test-campaign/VenomStrike.json`): subclass `Assassin` → `Thief`. Note the character's actual ruleset is `5e` (not 2024), so the 5e Thief data path (`public/data/classes.json` subclasses[0], Fast Hands level 3) supplies the feature. No 2024 data change was required for this character.

Playwright walkthrough (dev server on :5173):
- Fast Hands appears in **Bonus Actions** section ✅
- Clicking it opens the bonus-action choice modal with all 3 options (Sleight of Hand / Thieves' Tools / Use an Object) ✅
- Selecting Sleight of Hand and clicking "Use Bonus Action" shows the correct description popup ✅
- Campaign log records `ability_use` "Fast Hands — Sleight of Hand selected" + a valid skill `roll` entry ✅

### Bug found & fixed during verification
The Fast Hands → Sleight of Hand dice popup showed a **NaN** modifier (console: `Received NaN for the children attribute`).
- **Cause**: `src/components/char-sheet/CharAbilities.jsx:352` passed `skillName` (a string) to `getSkillBonus(skill)`, which expects a skill object → `skill.bonus` was `undefined`, giving `NaN`.
- **Fix**: pass the resolved `skill` object to `getSkillBonus(skill)`.
- **Regression test**: tightened `CharAbilities.contextFeatures.test.jsx` assertions (old `expect.any(Number)` silently matched `NaN`) to assert the exact bonus value and non-NaN.

Re-verified: popup shows correct `-1` modifier / total 19, zero console errors. `npm run lint` clean; CharAbilities + fastHands suites pass (456 tests).
