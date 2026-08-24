# Bug Report: SP-064 Hex Automation Failure

## Summary
Hex spell automation (SP-064) casts the spell and applies concentration to the caster, but **fails to apply the target effect** (`hex_ability_check_disadvantage`) to the target creature. The spell also lacks a target selection step.

## Environment
- **Campaign:** test-campaign
- **Character:** Bard_Spellcaster (Level 9, Bard/College of Lore, 2024 ruleset)
- **Spell:** Hex (Level 1, Enchantment, Concentration, Bonus Action)
- **Intended Target:** Aarakocra Aeromancer

## Expected Behavior
1. When Hex is cast, a target selection popup should appear
2. After selecting a target and ability, the spell should apply:
   - Concentration on the caster (tracking spell duration)
   - `hex_ability_check_disadvantage` target effect on the target creature (with chosen ability)
   - Necrotic damage rider setup for when caster hits the target with an attack
3. A "Done" button should appear to confirm/cancel the cast

## Actual Behavior
1. **No target selection popup** — After selecting level and clicking "Cast Spell", only an ability selection popup appears
2. **No "Done" button** — The ability selection popup only has a "Cancel" button
3. **Concentration applied to caster** — `activeBuffs` on Bard_Spellcaster includes:
   ```json
   { "name": "Hex", "effect": "hex_concentration", "duration": "concentration" }
   ```
4. **Target effect NOT applied** — `hex_ability_check_disadvantage` was NOT added to any creature's target effects
5. **Necrotic damage rider NOT set up** — No mechanism to add 1d6 necrotic damage on attack hits against the target

## Evidence

### Campaign Log Entry (correct)
```json
{
  "type": "spell",
  "characterName": "Bard_Spellcaster",
  "spellName": "Hex",
  "spellLevel": 1,
  "castingTime": "1 bonus action",
  "hexAbility": "WIS",
  "effectsApplied": "ability check disadvantage"
}
```

### Concentration on Caster (partial - correct)
In `character-change-data.json`, Bard_Spellcaster's `activeBuffs`:
```json
{
  "name": "Hex",
  "effect": "hex_concentration",
  "duration": "concentration"
}
```

### Target Effect Missing (BUG)
In the Initiative tracker, Aarakocra Aeromancer 1 showed:
- "Charmed" condition (from Dominate Beast, pre-existing)
- **NO** "hex_ability_check_disadvantage" effect

### Character Sheet Concentration Line
Shows: `Concentration: Hex (DC 10 Constitution)` — confirming concentration was added to the caster.

## Root Cause Analysis
The Hex spell automation appears to:
1. Show level selection popup ✓
2. Show ability selection popup ✓
3. Apply concentration to caster ✓
4. **Skip target selection** ✗
5. **Skip applying target effect** ✗
6. **Skip setting up necrotic damage rider** ✗

The spell info builder likely defines Hex with `hex_ability_check_disadvantage` in its target effects, but the spell casting flow never prompts for a target and never applies the effect to any creature.

## Files Involved
- `src/services/automation/handlers/spells/spellCastHandler.js` — Spell casting handler
- `src/services/combat/conditions/targetEffectDefinitions.js` — Defines `hex_ability_check_disadvantage` and `hex_save_disadvantage`
- `public/data/2024/spells.json` — Hex spell definition (has `status_effects: []`)

## Recommendation
The Hex spell needs a target selection step similar to other target-dependent spells (e.g., Bane, Charm Person). The automation should:
1. Prompt for target selection after ability choice
2. Apply `hex_ability_check_disadvantage` to the selected target
3. Set up the necrotic damage rider on the caster's attack automation

## Initial Review
This may not be an issue as it sound like the AI never selected a target using the player's creature card on initiative.jsx