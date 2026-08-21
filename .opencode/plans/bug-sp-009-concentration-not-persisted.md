# Bug: Aura of Purity Concentration Not Persisted to Change Data File

## Overview

When Aura of Purity is cast, the concentration is correctly added to the in-memory combatSummary and displays in the UI, but it is NOT persisted to the `character-change-data.json` file. After a page reload or server restart, the concentration data is lost.

## Expected Behavior

After casting Aura of Purity, the `combatSummary.concentration` field in `character-change-data.json` should contain the concentration entry for PaladinAuraTest with:
- `spell`: "Aura of Purity"
- `dc`: 10 (8 + CON modifier of 2)
- `id`: a unique identifier

## Actual Behavior

The `combatSummary.concentration` field remains `null` in `character-change-data.json` after casting Aura of Purity. The concentration only exists in the browser's in-memory runtime store and is lost on page reload.

## Steps to Reproduce

1. Navigate to "test-campaign" and select "PaladinAuraTest" character
2. Ensure combat is active with creature targets (Test Goblin, Bandit 1, Goblin 1)
3. Click "Aura of Purity" in the spell list, then click "Cast Spell"
4. Select targets (e.g., Test Goblin, Bandit 1, Goblin 1) and click "Cast Aura of Purity (3)"
5. Observe that the UI shows "Concentration: Aura of Purity (DC 10 Constitution)" on PaladinAuraTest
6. Read `public/campaigns/test-campaign/data/character-change-data.json`
7. Observe that `combatSummary.concentration` is `null`

## Likely Location

**`src/services/automation/handlers/buffs/auraOfPurityHandler.js:76-77`**

```javascript
const combatSummary = getCombatSummary(campaignName);
addConcentration(combatSummary, casterName, 'Aura of Purity', 10 + Math.floor(playerStats.concentrationBonus || 0));
```

The `addConcentration` function (in `src/services/combat/concentration/concentrationService.js:92-101`) modifies the combatSummary object in memory but does NOT persist it back to storage. Compare with how other handlers (e.g., `spellCastHandler.js` for Mantle of Majesty at lines 38-44) explicitly call `storage.set('combatSummary', combatSummary, campaignName)` after modifying concentration.

## Notes

- The target effects, active buffs, save advantage conditions, and pending expirations ALL persist correctly.
- Only the concentration tracking on the caster is affected.
- This affects ALL concentration spells, not just Aura of Purity. The same pattern exists in other spell handlers that call `addConcentration` without persisting the combatSummary.
