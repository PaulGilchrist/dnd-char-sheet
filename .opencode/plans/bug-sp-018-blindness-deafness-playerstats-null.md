# SP-018 Blindness/Deafness: playerStats is null causing handler crash

## Overview

The Blindness/Deafness spell automation crashes before it can display the save prompt or apply any condition. The `playerStats` parameter passed to the handler is `null`.

## Expected Behavior

One creature that you can see within range must succeed on a Constitution saving throw, or it has the Blinded or Deafened condition (your choice) for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.

## Actual Behavior

The spell cast fails immediately with:
```
[automation] Handler blindness_deafness/undefined failed: TypeError: Cannot read properties of null (reading 'spellAbilities')
    at buildSaveDc (savePrompt.js:15:19)
    at handle (blindnessDeafnessHandler.js:16:17)
```

The `playerStats` parameter passed to `blindnessDeafnessHandler.handle()` is `null`. In `savePrompt.js:16`, `buildSaveDc` tries to access `playerStats.spellAbilities?.saveDc` but `playerStats` itself is null, causing the crash before any modal can appear for choosing Blinded vs Deafened.

## Steps to Reproduce

1. In "test-campaign", create or use a 2024 Cleric with the Blindness/Deafness spell
2. Start combat with an enemy creature within 120 feet
3. Click Blindness/Deafness in the character sheet spells
4. Click "Cast Spell"
5. Observe the error — the spell never reaches the modal selection step

## Likely Location

- `src/services/automation/handlers/spellHandler.js` — The spell handler is not passing `playerStats` correctly to the `blindnessDeafnessHandler`
- `src/services/automation/handlers/blindnessDeafnessHandler.js:16` — Calls `buildSaveDc` with a null `playerStats`
- `src/services/automation/handlers/savePrompt.js:15-16` — `buildSaveDc` tries to access `playerStats.spellAbilities?.saveDc` without checking if `playerStats` is null

## Notes

- The spell has 120 ft range, 2nd level, CON save — all correct in the spell data
- The fix should ensure `playerStats` is correctly resolved and passed to the handler, or add a null check in `buildSaveDc`
