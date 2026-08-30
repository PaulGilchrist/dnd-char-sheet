# Bug CLA-218 — Mage Hand Legerdemain (2024 Arcane Trickster lv3)

## Overview
Mage Hand Legerdemain (`public/data/2024/classes.json` Rogue → majors "Arcane Trickster" → features[1], lv3, automation = [passive_rule/mage_hand_legerdemain, conditional_advantage/DEX ability_check, mage_hand_control 1 bonus action]) has a fully wired runtime handler (`mage_hand_control` → popup + ability_use log), but NO reachable UI surface and none of the rule effects are applied. Verified 2026-08-30 in test-campaign with newly built 2024 Rogue **ArcaneTricksterTest lv3** (Arcane Trickster).

## Expected
Casting Mage Hand: cast as a Bonus Action, spectral hand Invisible. Control the hand as a Bonus Action; can make Dexterity (Sleight of Hand) checks through it (advantage per data's conditional_advantage entry).

## Actual
1. **No Bonus Actions row ever renders.** `categorizeFeatures` (`src/services/character/featureCategorizationUtils.js:58-88`) takes the FIRST automation entry with a `casting_time` — automation[0] is `passive_rule` / `casting_time:'passive'` — so the whole feature lands in Special Actions and never in bonusActions, even though automation[2] is `mage_hand_control` / `'1 bonus action'`. Runtime probe: `collectAutomationFromFeatures([feat])` DOES return `bonusActions:[mage_hand_control::Mage Hand Legerdemain]` (automationRouter.js:454), but the sheet Bonus Actions section is empty out-of-combat and in-combat (combat staged with 2× Animated Rug).
2. **The rendered feature row is INERT.** Sheet Special Actions shows `<b class="">Mage Hand Legerdemain:</b>` — no `clickable` class, `onclick:false`; click (force, and again mid-combat) opens NO popup, writes no change-data, no console error. Cause: `isInteractiveAutomation` (`src/services/combat/automation/automationService.js:66-73`) inspects `automation[0]` only → passive_rule not in INTERACTIVE_PASSIVE_EFFECTS → inert (CLA-179 family). Therefore `handleMageHandControl` (`src/services/automation/handlers/class-fighter-rogue/mageHandControlHandler.js`, dispatched at `src/services/automation/index.js:447`, popup+log per its passing unit test) is UNREACHABLE from the UI — no trigger path emits a `mage_hand_control` action.
3. **Mage Hand cast is not modified.** The cantrip is granted to the sheet (`spellCalc2024.js:41-53`; spell table row + details popup live), but the popup shows "Casting Time: Action" — no bonus-action override for Arcane Tricksters, no Invisible-hand application, no activeBuffs/activeConditions/targetEffects. Clicking "Cast Spell" wrote NOTHING to change-data (`ArcaneTricksterTest.activeConditions:[]`, no mage/hand keys).
4. **No Sleight of Hand automation.** The `conditional_advantage` (DEX check, condition `mage_hand_legerdemain`) is collected into passives (`automationModifiers.js:9`) but NO consumer anywhere in src references `mage_hand_legerdemain` (grep: only turnStartEffects.js collector push at `src/services/combat/automation/turnStartEffects.js:64` and tests) — no flag writer, no advantage branch, no SoH-through-hand roll surface. Same for the collected `mage_hand_legerdemain` turn-start effect: `src/services/rules/effects/turnStartEffects.js` has NO branch for it.

## Steps to Reproduce
1. 2024 wizard: Rogue lv3, subclass Arcane Trickster (created as ArcaneTricksterTest; subclass persists as `class.subclass.name`, mapped to major in `classRules2024.js:30-34`).
2. Open sheet: Bonus Actions section empty; Special Actions shows inert "Mage Hand Legerdemain:" text (click → nothing).
3. Encounter Builder → tick Animated Rug of Smothering → Join Encounter → reopen sheet: still no Bonus Actions row; row still inert.
4. Spells table → Mage Hand → popup "Casting Time: Action" → Cast Spell → change-data shows no effect/buff/invisibility.
5. In-page probe: `collectAutomationFromFeatures([feat])` returns the mage_hand_control bonusAction — proving the handler layer is fine and the sheet-row categorization/interactivity gate is the break.

## Likely Location
- `src/services/character/featureCategorizationUtils.js:58-88` — castingTime chosen from automation[0]'s `passive`, collapsing multi-automation rows into Special Actions (never bonusActions).
- `src/services/combat/automation/automationService.js:66-73` (`isInteractiveAutomation`) — reads `automation[0]` only → inert `<b>` row; mage_hand_control (and conditional_advantage) never interactive. CLA-179/CLA-192 dedupe family.
- `src/services/rules/core/spellCalc2024.js:41-53` — grants Mage Hand but never overrides `casting_time` to bonus action nor applies invisible to the hand.
- `src/services/combat/automation/turnStartEffects.js:64` + `src/services/rules/effects/turnStartEffects.js` — collector pushes `mage_hand_legerdemain` with zero consumer branch.
- Manifest paths (`src/services/combat/automation/handlers/classFeatureHandler.js`, routers/classFeatureRouter.js, infoBuilders/classFeatureInfoBuilder.js) DO NOT EXIST — real impl is `src/services/automation/handlers/class-fighter-rogue/mageHandControlHandler.js` + `src/services/combat/automation/automationRouter.js:454` + `automationInfoBuilder/core-handlers.js:325`; "Automation type: undefined" reflects there being no interactive row dispatched.

## Notes
Handler internals are proven correct by isolation (collector probe + passing unit test mageHandControlHandler.test.js): popup "Move the spectral hand up to 30 feet" + ability_use log. Fix requires (a) multi-automation row categorization to honor the `1 bonus action` entry (or a dedicated row per automation entry), (b) interactivity for `mage_hand_control` (add to INTERACTIVE_HANDLER_TYPES or per-entry row gate), (c) a legerdemain flag/condition consumer for BA cast + invisible hand + DEX (Sleight of Hand) advantage. Test char ArcaneTricksterTest lv3 kept in test-campaign for post-fix retest.
