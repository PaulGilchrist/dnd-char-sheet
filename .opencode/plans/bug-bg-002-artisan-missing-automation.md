# Bug: BG-002 (Artisan) - Automation handler, router, and infoBuilder files missing; no automation defined in background or feat data

## Overview

The automation manifest (docs/automations-manifest.json) lists BG-002 (Artisan) as a background-type automation with handler, router, and infoBuilder files that do not exist. The Artisan background data and the Crafter feat it grants both lack any automation definitions. The "Expected Behavior" in the manifest is the background's flavor text description, not an actual automation behavior.

## Expected Behavior

Per the manifest, BG-002 (Artisan) should:
- Have a handler at `src/services/combat/automation/handlers/backgroundHandler.js`
- Have a router at `src/services/combat/automation/routers/backgroundRouter.js`
- Have an infoBuilder at `src/services/combat/automation/infoBuilders/backgroundInfoBuilder.js`
- Fire when trigger conditions are met (currently empty in manifest)
- Apply the behavior described in the background's flavor text

## Actual Behavior

1. **Missing files**: None of the three referenced files exist:
   - `src/services/combat/automation/handlers/backgroundHandler.js` - DOES NOT EXIST
   - `src/services/combat/automation/routers/backgroundRouter.js` - DOES NOT EXIST
   - `src/services/combat/automation/infoBuilders/backgroundInfoBuilder.js` - DOES NOT EXIST

2. **No automation in background data**: The Artisan entry in `public/data/2024/backgrounds.json` (line 15-25) has no `features` array with `automation` fields. Compare to Hermit (line 109-119) which has a `features` array with "Hermit's Wit" containing an automation object.

3. **No automation in Crafter feat**: The Crafter feat in `public/data/2024/feats.json` (around line 875) has no `automation` field. It only has `benefits` array with descriptive text.

4. **No background case in router**: `src/services/combat/automation/automationRouter.js` has no `case 'background':` handler. All routing cases are class features, spells, or specific automations.

5. **Expected Behavior is flavor text**: The manifest lists `"expectedBehavior": "You began mopping floors and scrubbi11g counters in an artisan's worl<shop..."` which is the background's flavor description, not an automation action.

## Steps to Reproduce

1. Create a 2024 character with the Artisan background (verified: `public/campaigns/test-campaign/ArtisanTest.json` loads successfully with "Background: Artisan" displayed)
2. The character has the Crafter feat (granted by Artisan background)
3. No automation fires for this character - the Crafter feature has no automation defined
4. No handler, router, or infoBuilder exists to process a "background" automation type

## Likely Location

- `docs/automations-manifest.json` line 392-402 - Manifest entry references non-existent files
- `public/data/2024/backgrounds.json` lines 15-25 - Artisan background has no features/automation
- `public/data/2024/feats.json` around line 875 - Crafter feat has no automation
- `src/services/combat/automation/automationRouter.js` - Missing `case 'background':` handler
- `src/services/combat/automation/automationCollector.js` - Background features are not collected for automation

## Notes

- The Hermit background (lines 99-120 in backgrounds.json) DOES have automation defined for "Hermit's Wit" with `automation: { type: "passive_rule", effect: "initiative_bonus", bonusExpression: "WIS modifier" }` - this proves the pattern exists for backgrounds with automation.
- The Artisan background has no such features array.
- The Crafter feat grants Tool Proficiency, Discount, and Fast Crafting abilities - none of which have combat-relevant automation defined.
- The background's flavor text in the manifest appears to be a copy-paste of the background description rather than an actual automation behavior specification.
- This automation was likely planned but never implemented, or the manifest entry was created incorrectly with flavor text instead of actual automation behavior.
