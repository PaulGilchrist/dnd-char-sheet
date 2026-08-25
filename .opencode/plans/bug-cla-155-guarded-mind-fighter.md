# Bug: CLA-155 - Guarded Mind Manifest Routing Incorrect

**Automation ID:** CLA-155
**Name:** Guarded Mind
**Class:** Fighter (Psi Warrior subclass)
**Ruleset:** 2024
**Feature Level:** 10

## Summary

The manifest entry for CLA-155 (Guarded Mind) references three non-existent files. The actual implementation uses different files through the automation index routing system.

## Manifest Entry (Incorrect)

```json
{
  "id": "CLA-155",
  "name": "Guarded Mind",
  "type": "classFeature",
  "handler": "src/services/combat/automation/handlers/classFeatureHandler.js",
  "router": "src/services/combat/automation/routers/classFeatureRouter.js",
  "infoBuilder": "src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js",
  "verified": "not verified",
  "class": "Fighter",
  "triggerConditions": "Automation type: undefined",
  "expectedBehavior": "Resistance to Psychic damage. Can expend Psionic Energy Die to end Charmed/Frightened conditions."
}
```

## Actual Implementation

### Data Source
- **File:** `public/data/2024/classes.json` (line ~5629)
- **Feature:** Guarded Mind (Psi Warrior, level 10)
- **Automation array:** Two entries:
  1. `{ "type": "resistance", "damageTypes": ["Psychic"] }` — passive Psychic resistance
  2. `{ "type": "guarded_mind", "resource": "psionicEnergy", "casting_time": "1 action" }` — active condition removal

### Handler
- **File:** `src/services/automation/handlers/class-sorcerer/guardedMindHandler.js`
- **Mapped in:** `src/services/automation/index.js` line 396: `guarded_mind: handleGuardedMind`
- **Note:** Handler is in `class-sorcerer/` folder but handles a Fighter (Psi Warrior) feature — misleading folder name

### Resistance Handler
- **File:** `src/services/automation/handlers/combat/damageReductionHandler.js`
- **Mapped in:** `src/services/automation/index.js` line 339-345: `damage_reduction` handler

### Router
- **File:** `src/services/combat/automation/automationRouter.js`
- **Line 148-158:** `resistance` type routed to `result.passives`
- **Line 283-289:** `guarded_mind` type routed to `result.actions` or `result.bonusActions`

### Info Builder
- **File:** `src/services/combat/automation/automationInfoBuilder/spell.js` line 150-159: `guarded_mind` handler
- **File:** `src/services/combat/automation/automationInfoBuilder/core-handlers.js` line 196-203: `resistance` handler

### Array Handling
- **File:** `src/services/automation/index.js` lines 677-688
- When a feature has an automation array, the first actionable entry is selected
- `resistance` entry is skipped (no `casting_time`/`action`/`trigger`)
- `guarded_mind` entry is selected (has `casting_time: "1 action"`)
- The `resistance` entry is NOT executed through the handler system but IS processed as a passive (routed to `passives` array, then processed in `rulesFactory.js` lines 101-114)

### Passive Resistance Processing
- **File:** `src/services/rules/rulesFactory.js` lines 101-114
- `passives` filtered for `type === 'resistance'`, `damageTypes` flat-mapped into `playerStats.resistances`
- Psychic resistance IS correctly applied to the player's resistances

## Issues Found

1. **Handler file doesn't exist:** `src/services/combat/automation/handlers/classFeatureHandler.js`
2. **Router file doesn't exist:** `src/services/combat/automation/routers/classFeatureRouter.js`
3. **InfoBuilder file doesn't exist:** `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js`
4. **Trigger conditions incorrect:** "Automation type: undefined" — should list both `resistance` and `guarded_mind` types
5. **Handler folder misnomer:** `class-sorcerer/guardedMindHandler.js` handles a Fighter feature, not Sorcerer

## What Actually Works

- Psychic resistance: PASS — routed through `resistance` → `passives` → `rulesFactory.js` auto-resistances
- Condition removal (Charmed/Frightened): PASS — routed through `guarded_mind` → `HANDLER_MAP` → `guardedMindHandler.js`
- Psionic Energy decrement: PASS — handler decrements psionicEnergy resource
- Logging: PASS — handler calls `addEntry` with ability_use type
- Tests: PASS — `guardedMindHandler.test.js` has 9 test cases covering all scenarios

## Character Registry Note

EvasiveFighter is a level 5 Battle Master Fighter. Guarded Mind is a level 10 Psi Warrior feature. EvasiveFighter does NOT have this feature.

## Required Fixes

Update the manifest entry in `docs/automations-manifest.json`:

```json
{
  "id": "CLA-155",
  "name": "Guarded Mind",
  "type": "classFeature",
  "handler": "src/services/automation/handlers/class-sorcerer/guardedMindHandler.js",
  "router": "src/services/combat/automation/automationRouter.js",
  "infoBuilder": "src/services/combat/automation/automationInfoBuilder/spell.js",
  "verified": "not verified",
  "class": "Fighter",
  "triggerConditions": "resistance, guarded_mind",
  "expectedBehavior": "Resistance to Psychic damage. Can expend Psionic Energy Die to end Charmed/Frightened conditions."
}
```
