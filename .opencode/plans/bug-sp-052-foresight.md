# Bug: SP-052 Foresight — Handler Not Wired Up

## Summary

Foresight spell automation (`automation.type: 'foresight'`) never applies its effects because the handler is never registered in `HANDLER_MAP`.

## Expected Behavior

When a character casts Foresight (9th-level Divination spell), the target should receive:
- Advantage on D20 Tests (attacks, saves, ability checks)
- Disadvantage on attack rolls against the target (unless attacker has Blindsight/Truesight)

## Actual Behavior

The spell cast completes but NO target effects are applied. The `triggerForesight` service function exists and is fully implemented with tests, but it is **never called** from the spell casting pipeline.

## Root Cause

The spell data in `public/data/spells.json` and `public/data/2024/spells.json` contains:
```json
"automation": { "type": "foresight", "duration": "8 hours" }
```

When Foresight is cast, the spell casting flow is:
1. `executeSpellCast` → `handleGenericAutomation` (line 211 of `execution/index.js`)
2. `handleGenericAutomation` calls `executeHandler(action, ...)`
3. `executeHandler` looks up `HANDLER_MAP[auto.type]` where `auto.type = 'foresight'`
4. **`HANDLER_MAP['foresight']` is `undefined`** — no entry exists
5. `executeHandler` returns `null` (line 703-705 of `automation/index.js`)
6. `handleGenericAutomation` returns `{ handled: true }` — spell cast completes silently
7. **No target effects are applied**

## Evidence

### `foresightService.js` exists but is never wired up

`src/services/rules/features/foresightService.js` (76 lines) contains a fully implemented `triggerForesight` function that:
- Adds `activeBuffs` entry on target
- Adds `targetEffects` entries (`foresight`, `advantage_attacks`, `advantage_saves`, `advantage_abilities`)
- Returns a popup with automation info

**But it is never imported or called from anywhere in the spell casting pipeline.**

### No handler in `HANDLER_MAP`

`src/services/automation/index.js` line 297-617: `HANDLER_MAP` contains 200+ entries but **no `'foresight'`**.

### No handler in `triggerSpells.js`

`src/services/rules/spells/spellCastService/execution/triggerSpells.js` (627 lines): **no `handleForesight`** function. `triggerForesight` is not imported.

### Target effect definition exists

`src/services/combat/conditions/targetEffectDefinitions.js` line 478-486: `foresight` effect is properly defined with label, description, icon, and group.

### Condition effects handler exists

`src/services/combat/conditions/conditionEffects.js` line 451-458: `foresight` is handled to apply advantage on attacks, saves, and ability checks.

### Tests exist for `triggerForesight`

`src/services/rules/features/foresightService.test.js` (271 lines): comprehensive tests for the service function.

## Fix Required

Add `'foresight'` entry to `HANDLER_MAP` in `src/services/automation/index.js`:

```js
import { triggerForesight } from '../../rules/features/foresightService.js';

// In HANDLER_MAP:
'foresight': triggerForesight,
```

The `triggerForesight` function signature `(spell, metaCtx, playerStats, campaignName, mapName)` is compatible with `executeHandler`'s call pattern `(action, playerStats, campaignName, mapName, characters)` — the first argument is the action/object with spell data, and the remaining args match.

## Files to Modify

- `src/services/automation/index.js` — Add import and HANDLER_MAP entry

## Verification

After fix, casting Foresight should:
1. Add `activeBuffs` entry with `{ name: 'Foresight', effect: 'foresight', duration: '8 hours', source: <caster> }` on target
2. Add `targetEffects` entries for `foresight`, `advantage_attacks`, `advantage_saves`, `advantage_abilities`
3. Show automation popup confirming the effect
