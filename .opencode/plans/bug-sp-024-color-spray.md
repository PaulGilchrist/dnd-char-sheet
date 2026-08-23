# Bug: SP-024 Color Spray - Cast button disabled in area effect modal + wrong condition applied

## Overview

Color Spray (SP-024) automation cannot be tested because the area effect modal's cast button remains disabled even when a valid target is selected. Additionally, the underlying handler hardcodes the wrong condition.

## Expected Behavior

1. Player casts Color Spray as a spell action
2. Area effect modal appears showing creatures in the 15-foot Cone
3. Player selects a target creature (e.g., Test Goblin)
4. The cast button becomes enabled
5. On cast, each creature in the cone makes a CON saving throw
6. On a failed save, the target receives the **Blinded** condition until the end of the caster's next turn

## Actual Behavior

1. Player opens area effect modal for Color Spray
2. Selects Test Goblin as target
3. The cast button **remains disabled** — spell cannot be cast
4. Additionally, even if the spell could be cast, `saveOnlyHandler.js` hardcodes `stunned` condition instead of reading `automation.effects.fail[0].condition` (which is `blinded`)

## Steps to Reproduce

1. Open "test-campaign" with ColorSprayTest (Level 3 Draconic Sorcerer, 2024 rules)
2. Cast Color Spray spell
3. Area effect modal appears with Test Goblin in the 15-foot Cone
4. Click on Test Goblin to select it
5. Observe the cast button remains disabled
6. Navigate to `src/services/combat/automation/handlers/saveOnlyHandler.js` — line hardcoding `stunned` instead of reading `automation.effects.fail[0].condition`

## Likely Location

- **Handler:** `src/services/combat/automation/handlers/saveOnlyHandler.js` — hardcodes `stunned` instead of reading `automation.effects.fail[0].condition`
- **UI:** Area effect modal component — cast button gating logic prevents save_only spells from enabling
- **Router:** `src/services/combat/automation/routers/spellRouter.js`

## Notes

- The manifest entry SP-024 expects `Blinded` condition on failed CON save
- `saveOnlyHandler.js` currently applies `Stunned` instead, which is a different condition
- Two separate bugs: UI gating + wrong condition in handler
