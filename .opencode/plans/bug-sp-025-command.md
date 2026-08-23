# SP-025: Command Spell Automation Bug

## Summary
The Command spell automation is not functioning. When cast, the spell logs as cast but applies no effects to the target. The automation handler files referenced in the manifest do not exist, and Command is not registered in `SERVICE_HANDLED_SPELLS`, causing it to fall through to a generic status_effects fallback that incorrectly applies the "Prone" condition unconditionally.

## Expected Behavior (from manifest)
- Command is a 1st-level enchantment spell with WIS save DC
- Target must succeed on WIS save or follow the chosen command on its next turn
- 5 command options: Approach, Drop, Flee, Grovel, Halt
- Each command has distinct effects:
  - **Approach**: Target moves toward caster by shortest route, ends turn within 5 ft
  - **Drop**: Target drops held items, ends turn
  - **Flee**: Target moves away by fastest means
  - **Grovel**: Target gains Prone condition, ends turn
  - **Halt**: Target doesn't move, takes no action/bonus action

## Actual Behavior
- Spell casts successfully (logs "Cast Command")
- Automation result shows "0" with no effects applied
- No target selection modal appears for choosing command option
- No save roll is performed against target
- No condition or effect is applied regardless of command chosen

## Root Cause
1. **Missing handler files**: Manifest references:
   - `src/services/combat/automation/handlers/spellHandler.js` (does not exist)
   - `src/services/combat/automation/spellRouter.js` (does not exist)
   - `src/services/combat/automation/spellInfoBuilder.js` (does not exist)
2. **Not in SERVICE_HANDLED_SPELLS**: `Command` is not registered in `src/services/rules/spells/spellCastService/execution/triggerSpells.js`
3. **Generic fallback bug**: Falls through to `handleGenericAutomation` in `triggerSpells.js` which applies "Prone" condition unconditionally on failed save, ignoring the 5 command options

## Steps to Reproduce
1. Create a Level 1 Bard (or any spellcaster with Command)
2. Add Command spell to character's spell list
3. Add an NPC creature to initiative (e.g., Test Goblin)
4. Navigate to character page, click Command spell in spells table
5. Click "Cast Spell"
6. Observe: spell casts but no target is prompted, no save is rolled, no effect is applied
7. Check campaign log: shows "Cast Command" with result "0"

## Relevant Files
- `docs/automations-manifest.json` — SP-025 manifest definition
- `src/services/rules/spells/spellCastService/execution/triggerSpells.js` — `SERVICE_HANDLED_SPELLS` and `handleGenericAutomation`
- `src/services/rules/spells/spellCastService/execution/index.js` — Spell casting flow and status_effects fallback
- `src/services/combat/conditions/targetEffectDefinitions.js` — targetEffect registry (for new effect definitions)

## Fix Requirements
1. Create the missing handler/router/infoBuilder files OR register Command in `SERVICE_HANDLED_SPELLS`
2. Implement proper command option selection UI (dropdown/modal for Approach/Drop/Flee/Grovel/Halt)
3. Implement target selection for the spell
4. Roll WIS save against target's save DC
5. Apply appropriate effects based on chosen command option and save result
6. Log the automation result with command option and save outcome
