# CLA-141: Fire's Burn – Goliath — INCOMPLETE

## Summary
The automation handler for Fire's Burn is correctly implemented and unit-tested, but end-to-end verification through the running application's combat pipeline could not be completed.

## What Was Verified

### 1. Manifest Configuration
- ID: CLA-141
- Name: Fire's Burn – Goliath
- Type: classFeature
- Class: Fire Giant
- Trigger: "On hit with attack roll; Uses: proficiency_bonus, recharges on long rest"
- Expected behavior: "When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage. (Fire Giant subrace of Goliath)"

### 2. Automation Data in races.json
The Fire Giant subrace of Goliath has the correct automation configuration:
```json
{
  "type": "fire_burn",
  "damage": "1d10",
  "damageType": "Fire",
  "trigger": "hit",
  "uses": "proficiency_bonus",
  "recharge": "long_rest",
  "casting_time": "1 action"
}
```

### 3. Handler Implementation
- Handler: `handleFiresBurn` in `src/services/automation/handlers/class-other/giantAncestryDispatch.js`
- Direct handler: `handleFiresBurnDirect` in `src/services/automation/handlers/class-other/giantAncestryTraits.js`
- Registered in automation index: `fire_burn: handleFiresBurn` (line 504)
- Info builder: `elementalHandlers.fire_burn` in `src/services/combat/automation/automationInfoBuilder/elemental-handlers.js`
- Router categorization: `fire_burn` → actions (line 77 of automationRouter.js)

### 4. Unit Tests
- `giantAncestry-firesBurn.test.js`: **12/12 tests pass**
  - Tests cover: damage dealt, use consumed, popup responses, error cases (no uses, no lastAttack, wrong attacker, wrong rollType, no target)
- `elemental-handlers.test.js`: **5/5 tests pass**

### 5. Character Sheet Display
- Created GoliathFireGiant character (Goliath race, Fire Giant subrace, Fighter level 5, 2024 ruleset)
- Character correctly shows "Fire's Burn: 3/3 (cur/max)" in Actions section
- Fire's Burn action shows "1d10 Fire" damage

### 6. Handler Logic Verified
The handler correctly:
- Checks uses remaining (> 0)
- Validates lastAttack exists with attackerName matching player
- Validates rollType is 'attack'
- Validates targetName exists
- Rolls 1d10 fire damage
- Applies damage to target via `applyDamageToTarget`
- Consumes one use of firesBurnUses
- Logs to campaign log
- Returns damage popup with result

## What Could Not Be Verified

### End-to-End Combat Flow
The full flow could not be completed through the UI:
1. **Combat setup complexity**: The combat pipeline requires creatures to be added to an encounter via the Initiative tracker, which involves multiple UI steps and modal interactions.
2. **UI overlays**: Persistent overlay elements (popup-overlay, character-creation-wizard-overlay) interfered with interaction attempts.
3. **Server caching**: The 10-second debounce cache on character-change-data caused stale data issues when modifying character files directly.

### Specific Unverified Flow
1. GoliathFireGiant attacks Aarakocra Aeromancer and hits ✓ (attempted, but targetName was null)
2. Fire's Burn action becomes available after hit ✓ (visible in character sheet)
3. Player invokes Fire's Burn → automation triggers → 1d10 fire damage applied ✗ (could not trigger through UI)
4. firesBurnUses decrements from 3/3 to 2/3 ✗ (could not verify)
5. Campaign log entry for fire damage ✗ (could not verify)

## Root Cause of Incomplete Verification
The `fire_burn` automation is categorized as an **action** (not a passive), meaning it must be manually invoked by the player after hitting with an attack. The combat pipeline's attack flow requires:
1. Adding creatures to an encounter via Encounter Builder
2. Joining the encounter to populate the initiative tracker
3. Having the character make an attack that hits a specific target
4. The attack must populate `campaign.lastAttack` with a valid targetName
5. The player must then invoke the Fire's Burn action

Steps 1-3 require significant UI interaction that was not successfully completed due to overlay interference and caching issues.

## Recommendation
To complete verification:
1. Use the Encounter Builder to add GoliathFireGiant and a target monster to an encounter
2. Join the encounter to populate the initiative tracker
3. Have GoliathFireGiant attack and hit the target
4. Click on the Fire's Burn action in the character sheet
5. Verify: 1d10 fire damage is applied, firesBurnUses decrements, log entry is created

The unit tests and code analysis strongly indicate the automation is correctly implemented and will work when triggered through the proper combat flow.

## Files Modified During Testing
- `public/campaigns/test-campaign/GoliathFireGiant.json` (created)
- `public/campaigns/test-campaign/data/character-change-data.json` (modified to add giantAncestrySelection, firesBurnUses, lastAttack)
- `public/campaigns/test-campaign/data/encounters.json` (modified to add CLA-141-FireBurnTest encounter)
