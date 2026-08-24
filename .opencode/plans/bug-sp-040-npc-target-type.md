# Bug: SP-040 Entangle - NPCs Treated as Player Targets in AOEConditionModal

## Summary
When casting Entangle (or any area condition spell with `save_only` automation) at an NPC added via the Encounter Builder, the NPC is treated as a player target instead of being auto-resolved. This causes the save prompt to appear on the caster's screen instead of the save being rolled automatically.

## Root Cause
In `src/services/encounters/encounterToInitiative.js:180`, monsters are added to the initiative with:
```javascript
type: monster.type || 'npc',
```

The `monster.type` field from the monster JSON (e.g., "humanoid" for Aarakocra) is truthy, so it's used instead of "npc". This means NPCs have their monster type (humanoid, beast, etc.) as their `type` field.

In `src/components/char-sheet/modals/shared/AOEConditionModal.jsx:95`, the code checks:
```javascript
const isNpc = target.type === 'npc';
```

Since the NPC's type is "humanoid" (not "npc"), this check returns false, and the NPC is treated as a player target. The save prompt is sent via `sendSavePrompt()` instead of being auto-resolved.

## Impact
- NPCs added via Encounter Builder require the caster to manually roll saves for them
- The save results summary shows "0 targets saved, 0 targets failed" because the save prompt event is sent but the caster is rolling on behalf of the NPC
- The Restrained condition (or other conditions from failed saves) are not applied because the save result event isn't processed correctly

## Fix
The AOEConditionModal should check for `monsterIndex` or another field to determine if a creature is an NPC:

```javascript
// In AOEConditionModal.jsx, line 95:
const isNpc = target.type === 'npc' || !!target.monsterIndex;
```

Alternatively, the Encounter Builder should set `type: 'npc'` for all monsters regardless of their monster type.

## Evidence
1. Aarakocra 1 creature data shows `type: "humanoid"` and `monsterIndex: "aarakocra"`
2. Save prompt was sent via `POST /api/campaigns/test-campaign/savePrompt-Aarakocra%201` (request 116 in network logs)
3. Save results showed "0 targets saved, 0 targets failed" instead of actual results
4. When Restrained was manually applied via Set Condition modal, it displayed correctly on the creature card
