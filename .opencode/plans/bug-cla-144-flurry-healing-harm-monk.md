# Bug: CLA-144 - Flurry of Healing and Harm (Monk)

## Summary
The Flurry of Healing and Harm class feature automation is incomplete. The feature belongs to the Warrior of Mercy subclass but the test character (Disciplined_Monk) is a Warrior of the Elements. Additionally, the automation code has missing functionality for the core behavior.

## Character Setup Issue
- **Test Character:** Disciplined_Monk (Level 17 Monk, Warrior of the Elements)
- **Required Subclass:** Warrior of Mercy (has Hand of Harm, Hand of Healing, Flurry of Healing and Harm)
- **Warrior of the Elements has:** Elemental Attunement, Stride of the Elements, Elemental Strike, Elemental Epitome, Destructive Stride

The Flurry of Healing and Harm feature is defined in `public/data/2024/classes.json` under the Warrior of Mercy major at level 11:
```json
{
  "name": "Flurry of Healing and Harm",
  "level": 11,
  "automation": {
    "type": "passive_rule",
    "effect": "flurry_healing_harm",
    "usesExpression": "WIS modifier minimum 1",
    "casting_time": "passive"
  }
}
```

## Automation Code Issues

### 1. Flurry of Blows Handler Missing Feature Integration (`bonusAttacksHandler.js`)
The `applyFlurryOfBlows` function does NOT:
- Check for `flurryHealingHarmUses` before making strikes
- Replace Unarmed Strike damage rolls with Hand of Healing healing rolls when strikes remain
- Apply Hand of Harm damage on hits when all healing strikes are exhausted
- Decrement `flurryHealingHarmUses` counter

**Expected behavior:** When using Flurry of Blows with Flurry of Healing and Harm active, the handler should consume `flurryHealingHarmUses` and either heal allies (Hand of Healing) or deal necrotic damage (Hand of Harm) instead of regular unarmed strike damage.

### 2. Uses Counter Never Consumed (`turnStartEffects.js:258`)
The `applyFlurryHealingHarmTurnStart` function sets `flurryHealingHarmUses` to WIS modifier (minimum 1) at turn start, but no code decrements this counter. The feature description says "Uses equal to Wisdom modifier (minimum once)" implying limited uses.

### 3. FP Cost Skipping Works (Partial)
- `useCharActionsAutomation.js:171` - Correctly skips FP cost for Hand of Healing and Flurry of Blows
- `reactionDamageHandler.js:26-27` - Correctly skips FP cost for Hand of Harm

## Expected Behavior (from manifest)
> "When using Flurry of Blows, replace each Unarmed Strike with Hand of Healing without expending Focus Points. When making Unarmed Strike with Flurry and dealing damage, use Hand of Harm without expending Focus Point. Uses equal to Wisdom modifier (minimum once)."

## Required Fixes
1. **`bonusAttacksHandler.js`** - `applyFlurryOfBlows` needs to:
   - Check `flurryHealingHarmUses` at start of flurry
   - For each strike: if uses remain, apply Hand of Healing (heal) instead of damage
   - When healing strikes exhausted, apply Hand of Harm (necrotic damage + CON save)
   - Decrement `flurryHealingHarmUses` for each strike
   - Skip FP cost (already handled by useCharActionsAutomation)

2. **`turnStartEffects.js`** - The uses counter is set correctly but needs to be consumed by the bonusAttacksHandler

3. **Test character** - Needs to be changed to Warrior of Mercy subclass or a new character created

## Files to Modify
- `src/services/automation/handlers/combat/bonusAttacksHandler.js` - Add Flurry of Healing and Harm logic
- `src/services/rules/effects/turnStartEffects.js` - Verify uses consumption (likely in bonusAttacksHandler instead)
- Test character data (Warrior of Mercy subclass)
