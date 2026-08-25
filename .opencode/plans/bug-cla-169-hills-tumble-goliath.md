# Bug: CLA-169 Hill's Tumble – Goliath

## Summary
Hill's Tumble applies the `prone` condition permanently instead of granting Disadvantage on the target's next attack roll only (before end of its next turn).

## Expected Behavior (from manifest)
> "When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that creature **Disadvantage on its next attack roll before the end of its next turn**."

## Actual Behavior
The handler (`giantAncestryTraits.js:368-369`) applies the `prone` condition to the target's `activeConditions`:
```javascript
const newConds = Array.isArray(storedConds) ? [...storedConds, 'prone'] : ['prone'];
await setRuntimeValue(targetName, 'activeConditions', newConds, campaignName);
```

The `prone` condition is permanent — it persists until the creature uses its action to stand up. It does NOT expire at the end of the target's next turn.

## Root Cause
The implementation applies a permanent condition (`prone`) instead of a time-limited effect (Disadvantage on next attack only). While prone does grant Disadvantage on attack rolls, the duration mismatch means:

1. The target retains Disadvantage on ALL future attacks, not just the next one
2. The target cannot remove the effect without using an action to stand up
3. The effect persists across turns, rounds, and potentially encounters

## Evidence
- Handler: `src/services/automation/handlers/class-other/giantAncestryTraits.js:368-369`
- Dispatch: `src/services/automation/handlers/class-other/giantAncestryDispatch.js:380-381`
- Manifest: `docs/automations-manifest.json` — `"id": "CLA-169"`
- Race data: `public/data/2024/races.json` — Goliath > Hill Giant subrace says "give that target the Prone condition" (matches implementation, but manifest expected behavior says otherwise)

## Severity
Medium — The effect is functionally similar (Disadvantage on attacks) but the duration is wrong, making the feature significantly more powerful than intended.

## Fix
Either:
1. Change the expected behavior text in the manifest to match the prone condition implementation, OR
2. Implement a time-limited targetEffect (e.g., `attack_disadvantage`) that expires at the end of the target's next turn instead of applying the prone condition
