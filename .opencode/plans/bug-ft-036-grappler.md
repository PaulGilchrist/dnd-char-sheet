# Bug: FT-036 Grappler — Automation Does Not Match Manifest

## Summary
The Grappler feat's automation implementation does not match the expected behavior documented in `docs/automations-manifest.json` (FT-036).

## Manifest Expected Behavior
> "When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Grapple option. You can use this benefit only once per turn."

## What the Manifest Describes
The expected behavior describes two Grappler feat benefits:
1. **Advantage on grapple checks** (the STR/DX ability check to grapple)
2. **Pinning a grappled creature** (restraining as a bonus action)

## What the Code Actually Does

### 5e Ruleset
**Source:** `public/data/feats.json` — Grappler feat automation:
```json
{
  "type": "conditional_advantage",
  "target": "attack_roll",
  "condition": "grappling_target",
  "effect": "advantage",
  "casting_time": "1 action"
}
```

**Processing pipeline:**
1. `automationModifiers.js:9-18` — Extracts as saveModifier: `{ source: 'Grappler', target: 'attack_roll', condition: 'grappling_target', effect: 'advantage' }`
2. `conditionEffectsInternal.js:18-34` — `saveModifierApplies` checks if attacker's target has 'grappled' condition
3. `contextBuilder-sync.js:206-220` — Separate check grants advantage on attack rolls when target is grappled

**Current behavior:** Grants **advantage on attack rolls** against a creature you're grappling. This is NOT the same as advantage on grapple checks.

### 2024 Ruleset
**Source:** `public/data/2024/feats.json` — Grappler feat has NO automation field at all. It's a minimal entry with only tags (`grapple`, `combat`, etc.).

**Result:** The 2024 Grappler feat has **zero automation** — no advantage on grapple checks, no pinning, no attack advantage.

## Root Cause
The 5e Grappler feat's automation was defined as `conditional_advantage` with `target: 'attack_roll'` and `condition: 'grappling_target'`, which implements advantage on **attack rolls** against grappled targets. This does not implement:
- Advantage on grapple ability checks (the grapple check itself)
- Pinning/restraining a grappled creature

The 2024 Grappler feat has no automation defined at all.

## Files to Fix
1. `public/data/feats.json` — Grappler feat automation needs to be updated to grant advantage on grapple checks (ability_check, not attack_roll)
2. `public/data/2024/feats.json` — Grappler feat needs automation added
3. Potentially `src/services/combat/conditions/conditionEffectsInternal.js` — needs to handle grapple check advantage from Grappler feat
4. Potentially `src/components/char-sheet/useCharActionsBaseActions.js` — grapple check uses `rollAbilityCheck` which would need to pick up the saveModifier

## Severity
Medium — The feat is partially functional (attack advantage against grappled targets works) but the manifest-specified behavior (advantage on grapple checks + pinning) is not implemented.
