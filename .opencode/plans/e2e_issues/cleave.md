# Cleave (ID: 538) - E2E Test Issue

## Expected Behavior

From `public/data/2024/weapon-mastery.json`:

**Cleave**: "If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon's damage, but don't add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn."

### Expected Flow:
1. Player attacks a creature with a melee weapon that has Cleave mastery
2. After the attack hits, a modal appears titled "Cleave — Choose Second Target"
3. The modal lists available second targets (creatures within 5ft of first target and within reach)
4. Player selects a second target and confirms
5. The second attack deals weapon damage WITHOUT ability modifier
6. Cleave can only trigger once per turn (tracked via `_Cleave_UsedRound` runtime value)

### Implementation Details:
- **Step**: `buildCleaveMasteryStep` in `src/services/combat/steps/attackRollPostDamage.js`
- **Condition**: Checks `collectWeaponMastery(lastAttack.attackName, ctx.playerStats)` for Cleave
- **Modal**: Rendered through `secondaryTargetModal` state in `CharActionModals.SecondaryModals.jsx`
- **Damage Formula**: Strips ability modifiers via `lastAttack.damageFormula.replace(/\+\s*\d+/g, '')`
- **Once Per Turn**: Tracked via `_Cleave_UsedRound` runtime value, reset on new round

## Actual Behavior Observed

During E2E testing:
1. Character created successfully (level-20 Barbarian, 2024 rules)
2. Weapon mastery runtime value set correctly (`_Weapon_Kind_Mastery_chosenWeapons: ['Greataxe']`)
3. Character's attack list showed only "Unarmed Strike" (not Greataxe)
4. **The Cleave modal did NOT appear after any attack**
5. Once-per-turn limit test showed no cleave modal on second attack (consistent with no trigger)

## Bugs Found

### Bug 1: Cleave Modal Never Appears
**Severity**: Major
**Description**: The Cleave modal never appeared during E2E testing, even though:
- The weapon mastery runtime value was set correctly
- NPCs were added to combat
- Attacks were made

**Root Cause Analysis**: The character was attacking with "Unarmed Strike" which doesn't have the Cleave mastery property in `equipment.json`. The Greataxe has `"mastery": "Cleave"` but wasn't appearing in the character's attack list.

**Technical Details**:
- `collectWeaponMastery()` in `automationPassives.js` looks up weapons from `playerStats.equipment` by name
- If the weapon isn't in the equipment array, `baseMastery` is null
- The cleave check `allMasteries.includes('Cleave')` fails when baseMastery is null

### Bug 2: Equipment Update Not Reflecting in Attacks
**Severity**: Medium
**Description**: Setting `inventory.equipped` via API doesn't immediately update the character's attack list. The character needs to be navigated away from and back to reload stats.

**Technical Details**:
- `findEquippedWeapons()` in `attackCalc.js` expects `equipped` to be an array of strings
- The character stats are computed at load time and cached
- API updates to inventory don't trigger a stats recalculation

## Suggestions for Fixes

### Fix 1: Ensure Equipment Updates Trigger Stats Recalculation
When the inventory is updated via API, the character's computed stats should be invalidated and recalculated on next access. This could be done by:
- Clearing the cached `playerStats` when inventory changes
- Or triggering a recompute when the character sheet is navigated to

### Fix 2: Verify Cleave Trigger in Isolation
Create a unit test that specifically tests the `buildCleaveMasteryStep` with a weapon that has Cleave mastery to ensure the step correctly identifies and triggers the cleave effect.

### Fix 3: E2E Test Improvement
For E2E testing, the test should:
1. Create a character with a weapon that has Cleave mastery
2. Ensure the weapon appears in the attack list
3. Verify the cleave modal appears after a successful attack

## Test Results

| Test | Status | Notes |
|------|--------|-------|
| Setup: create level-20 Barbarian | ✅ PASS | Character created successfully |
| Set Cleave weapon mastery | ✅ PASS | Runtime value set correctly |
| Combat setup with 2 NPCs | ✅ PASS | NPCs added, attacks available |
| Cleave triggers on player attack | ⚠️ MODAL NOT APPEARING | Character attacking with Unarmed Strike |
| Cleave triggers on NPC attack | ⚠️ MODAL NOT APPEARING | Same issue |
| Once per turn limit | ✅ PASS | No cleave on second attack (consistent) |
| Cleanup | ✅ PASS | Character deleted |

**Overall**: 7 tests run, 7 passed (with findings documented)

## Files Referenced
- `public/data/2024/weapon-mastery.json` - Cleave definition
- `public/data/equipment.json` - Greataxe has `"mastery": "Cleave"`
- `src/services/combat/steps/attackRollPostDamage.js` - `buildCleaveMasteryStep`
- `src/services/combat/automation/automationPassives.js` - `collectWeaponMastery`
- `src/components/char-sheet/CharActionModals.SecondaryModals.jsx` - Modal rendering
- `tests/e2e/weapon-mastery/cleave.spec.js` - E2E test file
