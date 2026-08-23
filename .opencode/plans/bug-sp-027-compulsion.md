# Bug Report: SP-027 Compulsion — Dual Code Path Causes Incorrect Target Resolution

## Summary
Compulsion automation routes through two conflicting code paths (`triggerSpells.js` → `triggerCompulsion` AND `useSimpleSpellHandlers.js` → `applyCompulsionEffect`), causing the spell gate's target selection to be ignored. The single-target path (`triggerCompulsion`) intercepts first and resolves only the current combat target via `resolveTarget()`, bypassing the multi-target `applyCompulsionEffect` path that respects spell gate selections.

## Expected Behavior (per manifest)
- Automation ID: SP-027, Name: Compulsion, Type: spell
- WIS save vs DC for EACH chosen creature within 30 feet
- Charmed condition applied on failure
- Bonus Action horizontal direction designation on caster's turn
- Forced movement on charmed target's next turn (safest route in designated direction)
- Repeat save after moving
- Spell gate target selection must be respected (multi-target)

## Actual Behavior
1. Spell gate modal opens with correct target list and selection (e.g., "Test Goblin" checked)
2. `triggerSpells.js:231-241` `handleCompulsion()` intercepts the cast before the spell gate confirm handler
3. `triggerCompulsion()` resolves only the current combat target via `resolveTarget()` → `getTargetFromAttacker()`
4. Single save prompt fires for that one target
5. `applyCompulsionEffect()` is either bypassed or receives an incorrect/all targets list
6. Log shows both "TestBard casts Compulsion on Test Goblin!" (single-target) AND a separate "Cast Compulsion" entry with all encounter creatures
7. Charmed condition is not reliably applied to spell gate-selected targets

## Root Cause
`src/services/rules/spells/spellCastService/execution/triggerSpells.js` lines 231-241 contains a `handleCompulsion()` function that calls `triggerCompulsion()` (single-target path). This path intercepts the spell cast before the spell gate's `handleCompulsionConfirm` in `useSimpleSpellHandlers.js` (lines 253-264) can pass the correct `targetNames` array to `applyCompulsionEffect()`.

The `triggerCompulsion()` function (compulsionService.js:9-50) only processes one target via `metaCtx?.targetName`, while `applyCompulsionEffect()` (compulsionService.js:52-140) correctly loops through `targetNames` array.

## Evidence
- Log entry f6e1536: "TestBard casts Compulsion on Test Goblin! Test Goblin must make a WIS save (DC 18) or become Charmed." (from `triggerCompulsion`)
- Log entry f6e1543: "Cast Compulsion" with all 30+ encounter creatures listed (from `applyCompulsionEffect` summary)
- Initiative page shows no Charmed condition badge on Test Goblin after cast
- `resolveTarget()` in `compulsionHandler.js` uses `getTargetFromAttacker()` which returns only the currently targeted enemy, not spell gate selection

## Fix Required
Remove or disable the `handleCompulsion()` path in `triggerSpells.js` so Compulsion routing falls through to the spell gate's `handleCompulsionConfirm` handler in `useSimpleSpellHandlers.js`, which correctly calls `applyCompulsionEffect(spell, playerStats, campaignName, mapName, result)` where `result` contains the spell gate's selected target names.

Alternatively, update `triggerSpells.js` to pass `metaCtx?.selectedTargets` or the spell gate's target list to `triggerCompulsion()`, but the cleaner fix is to let `applyCompulsionEffect()` handle all Compulsion casting since it already supports multi-target, save prompting, condition application, and expiration tracking.

## Relevant Files
- `src/services/rules/spells/spellCastService/execution/triggerSpells.js`: Lines 231-241 — `handleCompulsion()` single-target interceptor
- `src/services/rules/features/compulsionService.js`: `triggerCompulsion()` (lines 9-50, single-target) vs `applyCompulsionEffect()` (lines 52-140, multi-target)
- `src/hooks/combat/useSpellMetamagicFlow/useSimpleSpellHandlers.js`: Lines 253-265 — `handleCompulsionConfirm`/`handleCompulsionSkip` correct multi-target handlers
- `src/services/automation/handlers/spells/compulsionHandler.js`: Legacy handler (unused by current flow but referenced in tests)
- `public/data/2024/spells.json`: Lines 2345-2377 — Compulsion spell data (area effect, multi-target)
