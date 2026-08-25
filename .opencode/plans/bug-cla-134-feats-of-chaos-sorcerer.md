# Bug: CLA-134 Feats of Chaos - Stale Manifest Paths + Wrong Test Character

## Summary
CLA-134 (Feats of Chaos) automation references non-existent file paths in the manifest, and the designated test character (DraconicSorcerer) does not have this feature because it is a Draconic Sorcery Sorcerer, not Wild Magic Sorcery.

## Evidence

### 1. Manifest references non-existent files

The manifest at `docs/automations-manifest.json:2424` declares:

```json
{
  "id": "CLA-134",
  "name": "Feats of Chaos",
  "type": "classFeature",
  "handler": "src/services/combat/automation/handlers/classFeatureHandler.js",
  "router": "src/services/combat/automation/routers/classFeatureRouter.js",
  "infoBuilder": "src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js",
  "triggerConditions": "Action: passive",
  "expectedBehavior": "Manipulate chaos to give yourself Advantage on one D20 Test before rolling. Must cast Sorcerer spell with spell slot or finish Long Rest before using again. If you cast Sorcerer spell with spell slot before Long Rest, automatically roll on Wild Magic Surge table."
}
```

None of these files exist:
- `src/services/combat/automation/handlers/classFeatureHandler.js` — **NOT FOUND**
- `src/services/combat/automation/routers/classFeatureRouter.js` — **NOT FOUND**
- `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` — **NOT FOUND**

### 2. Actual implementation location

The real implementation is in:
- **Handler:** `src/services/automation/handlers/class-sorcerer/wildMagicSurgeHandler.js` (function `handleFeatsOfChaos` at line 262)
- **Router dispatch:** `src/services/automation/index.js` line 467 maps `feats_of_chaos` → `handleFeatsOfChaosAdvantage` (imported from wildMagicSurgeHandler.js line 155)
- **Trigger service:** `src/services/rules/features/wildMagicSurgeService.js` — `triggerWildMagicSurge()` checks for `featsOfChaosActive` at line 63-99
- **Consumption:** `src/hooks/combat/globalFeats.js` — `consumeFeatsOfChaos()` called from `useLoggedDiceRollAttack.js` line 343 after every d20 roll

### 3. Test character does not have the feature

DraconicSorcerer is a **Sorcerer (draconic sorcery), Level 6** (confirmed in app UI). Its features are:
- Draconic Resilience (level 3)
- Draconic Spells (level 3)
- Elemental Affinity (level 6)

Feats of Chaos is a **Wild Magic Sorcery level 3 feature** defined in `public/data/2024/classes.json` under the "Wild Magic Sorcery" major. Draconic Sorcery does not include Feats of Chaos.

Character JSON at `public/campaigns/test-campaign/DraconicSorcerer.json` confirms: no `feats_of_chaos` in automation passives, no Feats of Chaos in features list.

### 4. Unit tests confirm correct behavior

`src/services/automation/handlers/class-sorcerer/wildMagicSurgeHandler.test.js` has comprehensive tests for `handleFeatsOfChaos`:
- Activates with advantage popup when uses available
- Sets `featsOfChaosUses` to 0 and `featsOfChaosActive` to true
- Shows "no uses remaining" when exhausted
- Defaults uses to 1 when runtime value is null/undefined
- `onFeatsOfChaosConsume` correctly resets state

### 5. Integration flow is correct

When a Wild Magic Sorcerer casts a Sorcerer spell with a spell slot:
1. `wildMagicSurgeService.triggerWildMagicSurge()` is called
2. It checks `getFeatsOfChaosFeature()` for `type === 'feats_of_chaos'` in passives
3. If `featsOfChaosActive` is true, it resets uses to 1 and auto-triggers Wild Magic Surge modal
4. Otherwise, normal Wild Magic Surge handling proceeds
5. After any d20 roll, `consumeFeatsOfChaos()` is called to clear the advantage flag

## Root Cause

The manifest at `docs/automations-manifest.json` has **stale/incorrect file paths** that don't match the actual codebase structure. The automation was likely refactored from a generic `classFeatureHandler` to the sorcerer-specific `wildMagicSurgeHandler`, but the manifest was not updated.

## Recommendation

1. Update `docs/automations-manifest.json` CLA-134 entry to reference the actual handler path: `src/services/automation/handlers/class-sorcerer/wildMagicSurgeHandler.js`
2. Have the subagent edit the Sorcerer character changing its subclass/majopr to Wild Magic.  The subagent should have known to do this on their own based on the instructions it got from here /Users/paulgilchrist/Source/dnd-campaign-suite/.opencode/commands/automations-verify.md
3. The actual automation code and integration are correct — this is a documentation/manifest issue
