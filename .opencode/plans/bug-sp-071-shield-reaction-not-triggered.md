# Bug Report: SP-071 Shield - Reaction Not Triggered

## Summary
The Shield spell (SP-104 in automations manifest, referred to as SP-071 in test spec) fails to trigger as a reaction when the Bard_Spellcaster is attacked. The automation handler exists but is not being collected because there is no corresponding handler in the automation info builder.

## Environment
- **Campaign:** test-campaign
- **Character:** Bard_Spellcaster (Level 9, Bard/College of Lore, 2024 ruleset)
- **Spell:** Shield (1st-level Abjuration, Reaction, 1 round duration)
- **Automation Type:** `shield`

## Steps to Reproduce
1. Added "Shield" to Bard_Spellcaster's spells array in `public/campaigns/test-campaign/Bard_Spellcaster.json`
2. Navigated to the initiative page
3. Set Aarakocra Aeromancer 2's target to Bard_Spellcaster
4. Attempted to make an attack against Bard_Spellcaster via API POST to `/api/campaigns/test-campaign/attack`
5. Observed that Shield reaction was NOT triggered

## Expected Behavior
When an attack hits (or would hit) Bard_Spellcaster, the Shield spell should:
1. Trigger as a reaction
2. Display a popup: "Shield activated — +5 AC until start of your next turn, immune to Magic Missile"
3. Add a `shield` buff to the character's activeBuffs
4. Apply +5 AC retroactively to the triggering attack
5. If the attack would miss with +5 AC, rollback damage and heal the character

## Actual Behavior
- Shield does NOT appear in the character's Reactions section (only Countercharm, Cutting Words, Opportunity Attack are shown)
- No Shield popup appears when attacked
- No `shield` buff is added to activeBuffs
- No damage rollback occurs

## Root Cause Analysis

### The handler exists but is not wired into the info builder
The `handleShield` function IS registered in `src/services/automation/index.js`:
```javascript
import { handle as handleShield } from './handlers/shieldHandler.js';
// ...
HANDLER_MAP = {
    // ...
    shield: handleShield,  // Line 516
    // ...
}
```

### BUT there is no handler in the automation info builder
In `src/services/combat/automation/automationInfoBuilder/reaction.js`, the `reactionHandlers` dictionary does NOT include a `'shield'` entry. The dictionary contains handlers for:
- `reaction_bonus`, `reaction_damage`, `reaction_debuff`, `reaction_save`
- `shadowy_dodge`, `glorious_defense`, `beguiling_defenses`, `searing_vengeance`
- `illusory_self`, `reaction_counterspell`, `lucky_point`, `reaction_spell`
- `sentinel_guardian`, `interception`, `protection`, `dread_ambush_damage`

**Missing:** `'shield'` handler

### Flow break at buildAttackInfo
In `src/services/combat/automation/automationInfoBuilder.js`:
```javascript
function buildAttackInfo(feature, playerStats) {
    const auto = feature.automation
    if (!auto) return null
    const handler = DISPATCH[auto.type]  // DISPATCH doesn't have 'shield'
    if (handler) return handler(feature, playerStats)
    return null  // <-- Returns null for 'shield' type
}
```

### Flow break at collectAutomationFromFeatures
In `src/services/combat/automation/automationCollector.js`:
```javascript
const info = buildAttackInfo({ ...feature, automation: auto }, playerStats)
if (!info) continue  // <-- Skips 'shield' automation entirely
routeAutomation(info, auto, result)
```

### Result
The Shield spell automation is never collected, never routed to reactions, and never available for trigger during combat.

## Evidence
1. Character sheet Reactions section shows only: Countercharm, Cutting Words, Opportunity Attack (no Shield)
2. API attack POST returned success but no Shield reaction triggered
3. No Shield buff visible on character after attack
4. `grep -r "'shield'" src/services/combat/automation/automationInfoBuilder/` returns no matches

## Fix Required
Add a `'shield'` handler to `src/services/combat/automation/automationInfoBuilder/reaction.js`:

```javascript
'shield': (feature, _playerStats) => {
    const auto = feature.automation
    return {
        type: 'shield',
        name: feature.name,
        casting_time: auto.casting_time || '1 reaction',
        hasAutomation: true
    }
}
```

And ensure `routeAutomation` in `automationRouter.js` routes `'shield'` type to `result.reactions`:

```javascript
case 'shield':
    result.reactions.push(info)
    break
```

## Files to Modify
1. `src/services/combat/automation/automationInfoBuilder/reaction.js` - Add `'shield'` handler
2. `src/services/combat/automation/automationRouter.js` - Add `'shield'` case to route to reactions

## Verification Steps After Fix
1. Refresh Bard_Spellcaster character sheet - Shield should appear in Reactions
2. Make an attack against Bard_Spellcaster
3. Verify Shield popup appears
4. Verify +5 AC is applied
5. Verify damage rollback if attack would miss with +5 AC
6. Verify "Done" button dismisses the popup
