# Bug: CLA-093 Divine Strike Not Triggering

## Summary
Divine Strike feature automation (`damage_bonus` type with `trigger: weapon_attack_hit`) is not applying extra radiant damage when the Cleric hits a target with a weapon attack.

## Environment
- Campaign: test-campaign
- Character: DivineSmiteCleric (Level 3, Human, Cleric/Life Domain, 2024 ruleset)
- Target: Goblin NPC (AC 10, 10 HP)
- Attack: Unarmed Strike (+1 to hit)

## Steps to Reproduce
1. Create or load DivineSmiteCleric character (Level 3 Cleric with Divine Strike feature)
2. Add Goblin NPC to combat/initiative
3. Set target to Goblin on DivineSmiteCleric
4. Click Unarmed Strike action to attack
5. Attack hits (e.g., 14 vs AC 10)
6. Click Done on result modal
7. Check Goblin HP - remains at 10/10 (should be reduced)

## Expected Behavior
When DivineSmiteCleric hits a creature with a weapon attack, the Divine Strike feature should add 1d8 radiant damage to the attack. The target's HP should be reduced accordingly.

## Actual Behavior
- Attack registers as HIT in the log
- No damage is dealt to the target (Goblin remains at full HP)
- No damage modal or damage log entry appears
- No radiant damage visible in attack results

## Evidence
- Log shows: `→ Goblin HIT (AC 10)` with roll `(13)` and `13+1 (+1 to hit)`
- Goblin HP: 10/10 (unchanged after multiple hits)
- Character JSON correctly contains the feature with automation:
  ```json
  {
    "name": "Divine Strike",
    "automation": {
      "type": "damage_bonus",
      "trigger": "weapon_attack_hit",
      "damageExpression": "1d8",
      "damageType": "radiant",
      "oncePerTurn": true
    }
  }
  ```

## Root Cause Analysis
The `damage_bonus` automation type with `weapon_attack_hit` trigger is not being processed by the combat pipeline. Possible causes:
1. The 2024 ruleset's attack pipeline may not subscribe to or dispatch the `weapon_attack_hit` event
2. The `damage_bonus` handler may not be registered for the 2024 ruleset
3. The feature's automation metadata may not be properly collected/registered in the automation registry for 2024 characters

## Files to Investigate
- `src/services/combat/pipeline/actionPipeline.js` - Attack event chain
- `src/services/automation/` - Automation handler registry
- `src/services/rules/features/` - 2024 ruleset feature handling
- `src/services/rules/rulesFactory.js` - Ruleset selection
