# Incomplete: SP-050 Flesh to Stone UI Test

## Summary
UI testing of SP-050 Flesh to Stone automation could not be completed due to server-side caching preventing character data changes from taking effect.

## What Was Verified

### Unit Tests (PASS - 35/35)
All unit tests for `fleshToStoneHandler.test.js` pass, confirming the automation logic is correct:

- **Combat context validation**: Returns popup when no creatures in combat
- **Construct handling**: Constructs auto-succeed on save, get Speed 0
- **Failed save path**: Applies Restrained condition, registers `flesh_to_stone` targetEffect, sets up recurring save tracking, sends Flesh to Stone prompt
- **Successful save path**: Applies Speed 0, does NOT set up recurring save tracking
- **Recurring save tracking**: Sets up `_fleshToStone_{targetName}` tracking with successes/failures counters
- **Condition metadata**: Stores DC and ability in `activeConditionMeta.restrained`
- **Target effect registration**: Replaces existing `flesh_to_stone` effect for same target+source
- **Error handling**: Handles `addEntry` rejection gracefully
- **Metamagic**: Passes disadvantage when `metamagicHeighten` is set

### UI Setup Completed
- Aarakocra Aeromancer 1 added to initiative (HP 66/66, Init 11)
- Bard_Spellcaster target set to Aarakocra Aeromancer 1
- Bard_Spellcaster character updated:
  - Added "Flesh to Stone" to spells array
  - Switched rules from "2024" to "5e"
  - Added `subclass` field to class object

## Blockers

### 1. 2024 Ruleset Spell Slot Limitation
The 2024 ruleset caps spell slots at 5th level. Flesh to Stone is a 6th level spell, so it cannot be cast through the UI in the 2024 ruleset. The spell slot tabs only show levels 1-5.

### 2. Server In-Memory Cache
The server uses `changeData.js` with in-memory caching and 10s debounce. After editing `Bard_Spellcaster.json` to:
- Add `subclass` field (required by 5e ruleset)
- Add "Flesh to Stone" to spells array
- Switch rules to "5e"

The server continued serving the cached version without these changes, resulting in repeated errors:
```
Error: Missing object: class.subclass for Bard_Spellcaster
    at getProficiencies5e (rules-proficiencies.js:144:5)
```

The cache was not cleared by waiting (12+ seconds) or reloading the page.

### 3. Cannot Access React Internal State
The app uses React 19 with hooks-based state management. React state is not exposed on `window`, so JavaScript evaluation cannot trigger spell casting by manipulating component state.

## Automation Flow (Verified via Unit Tests)

1. **Spell trigger**: `fleshToStoneService.js` detects "Flesh to Stone" spell and calls `executeHandler`
2. **Handler execution** (`fleshToStoneHandler.js`):
   - Checks combat context exists with creatures
   - Resolves target from attacker's target selection
   - Constructs auto-succeed (Speed 0 until caster's next turn)
   - Creates save listener (CON save, DC calculated from spell save DC)
   - **On success**: Applies Speed 0 condition, no recurring saves
   - **On failure**: Applies Restrained condition, registers `flesh_to_stone` targetEffect, sets up recurring save tracking, sends Flesh to Stone prompt to GM
3. **Recurring saves**: `_fleshToStone_{targetName}` tracking tracks successes/failures; 3 successes ends spell, 3 failures applies Petrified
4. **Concentration break**: Cleans up flesh_to_stone effect and recurring save tracking
5. **Long rest**: Cleans up flesh_to_stone recurring save tracking

## Evidence

### Unit Test Results
```
Test Files  1 passed (1)
Tests       35 passed (35)
Duration    642ms
```

### Key Code Paths
- Handler: `src/services/automation/handlers/spells/fleshToStoneHandler.js`
- Service: `src/services/rules/features/fleshToStoneService.js`
- Effect definition: `src/services/combat/conditions/targetEffectDefinitions.js` (line 462-469)
- Save prompt: `src/services/combat/conditions/savePromptService.js` (sendFleshToStonePrompt)
- UI: `src/components/initiative/CreatureCard.jsx` (flesh-to-stone-prompt styling at lines 1137-1201)

## Conclusion
The automation logic is verified correct via 35 passing unit tests. UI testing was blocked by server-side caching preventing character data changes. To complete UI testing, the server cache would need to be cleared (e.g., by restarting the server or using an admin endpoint).
