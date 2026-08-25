# Bug Report: FT-045 Heavy Armor Master

## Summary
The 5e Heavy Armor Master feat automation does not match the expected behavior from the manifest. Multiple bugs exist in both the data definition and the runtime code.

## Expected Behavior (from manifest)
> When you're hit by an attack while you're wearing Heavy armor, any Bludgeoning, Piercing, and Slashing damage dealt to you by that attack is reduced by an amount equal to your Proficiency Bonus.

## Actual Behavior
The feat reduces ALL damage types by a fixed amount of 3, with no heavy armor requirement and no nonmagical weapon check.

## Bugs Found

### Bug 1: Wrong reduction value (data)
- **File:** `public/data/feats.json` line 289
- **Current:** `"reductionExpression": "3"` (hardcoded fixed value)
- **Expected:** `"reductionExpression": "proficiency_bonus"` (scales with character level)
- **Evidence:** The 2024 version (`public/data/2024/feats.json`) correctly uses `"reductionExpression": "proficiency_bonus"`. The 5e version should match.

### Bug 2: Missing damage type restriction (data)
- **File:** `public/data/feats.json` line 289
- **Current:** No `damageTypes` array in automation object
- **Expected:** `"damageTypes": ["Bludgeoning", "Piercing", "Slashing"]`
- **Evidence:** The 2024 version correctly includes `damageTypes`. Without it, `getDamageReduction()` at `src/services/combat/automation/automationPassives.js:365-368` matches ALL damage types (empty/absent `damageTypes` defaults to all types).

### Bug 3: Missing heavy armor condition (data)
- **File:** `public/data/feats.json` line 289
- **Current:** No `condition` field in automation object
- **Expected:** `"condition": "wearing_heavy_armor"`
- **Evidence:** The 2024 version correctly includes this condition. While `applyDamage.js:197-203` checks for heavy armor and passes `isWearingHeavyArmor` to `getDamageReduction()`, the `getDamageReduction()` function only respects the `condition` field if it exists (`automationPassives.js:369-372`). Without the condition in the data, the check is bypassed.

### Bug 4: Nonmagical weapon check not implemented (code + data)
- **Files:** `src/services/combat/automation/automationPassives.js` (line 355-397), `src/services/rules/combat/applyDamage.js`
- **Current:** The 5e feat JSON has `"trigger": "nonmagical_bludgeoning_piercing_slashing"` but `getDamageReduction()` never checks the `trigger` field (it only checks for `trigger === 'damage_taken_of_chosen_resistance_type'` at line 373).
- **Expected:** The `trigger` field should be handled, OR the `lastAttack` object should include an `isMagical`/`weaponMagical` field that `getDamageReduction()` can check.
- **Evidence:** `lastAttack` object (set in `applyDamage.js:126-142`) has no `isMagical` or `weaponName` field. Even if `getDamageReduction()` checked the trigger, there is no data source for whether the attacking weapon is magical.

## Impact
A character with Heavy Armor Master feat will incorrectly reduce ALL damage types (including fire, cold, lightning, necrotic, etc.) by 3 instead of only Bludgeoning/Piercing/Slashing from nonmagical weapons by their Proficiency Bonus. This is a significant over-buff.

## Comparison with 2024 Version
The 2024 version of Heavy Armor Master in `public/data/2024/feats.json` has the correct automation:
```json
"automation": {
    "type": "damage_reduction",
    "reductionExpression": "proficiency_bonus",
    "damageTypes": ["Bludgeoning", "Piercing", "Slashing"],
    "condition": "wearing_heavy_armor",
    "casting_time": "1 reaction"
}
```
The 5e version is missing all three of these fields (damageTypes, condition, correct reductionExpression).

## Verification Steps
1. Load a character with Heavy Armor Master feat (5e ruleset)
2. Equip heavy armor
3. Have a monster (e.g., Aarakocra Aeromancer with Wind Staff) attack the character
4. Observe that:
   - Nonmagical bludgeoning damage should be reduced by Proficiency Bonus (not fixed 3)
   - Lightning damage from the same attack should NOT be reduced
   - If the character is NOT wearing heavy armor, no reduction should apply
