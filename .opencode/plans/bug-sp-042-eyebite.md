# Bug: SP-042 Eyebite - Automation Not Implemented

## Summary
The Eyebite spell automation (`type: "eyebite"`) is declared in both `public/data/2024/spells.json` and `public/data/spells.json` but has NO handler in the automation pipeline. When cast, `buildAttackInfo()` returns `null` and the spell produces no effect.

## Evidence

### Spell data exists with automation metadata
Both rulesets define eyebite with:
```json
{
  "index": "eyebite",
  "automation": {
    "type": "eyebite",
    "saveType": "WIS",
    "range": "60 ft",
    "duration": "1_minute"
  },
  "status_effects": ["Unconscious", "Frightened", "Poisoned"]
}
```

### Missing handler in DISPATCH map
`src/services/combat/automation/automationInfoBuilder.js` line 47-52:
```js
function buildAttackInfo(feature, playerStats) {
    const auto = feature.automation
    if (!auto) return null
    const handler = DISPATCH[auto.type]  // DISPATCH[eyebite] = undefined
    if (handler) return handler(feature, playerStats)
    return null  // <-- eyebite hits this path
}
```

### No handler in any handler file
Searched all files in `src/services/combat/automation/automationInfoBuilder/`:
- `save.js` - has handlers for `save_attack`, `save_only`, `charm_person`, `flesh_to_stone`, `hold_monster`, `banishment`, `resilient_sphere`, `ottos_dance`, `power_word_stun`, `sleep`, `stinking_cloud`, `sleet_storm`, `confusion`, `tashas_laughter`, `imprisonment`, `prismatic_spray`, `forcecage` - NO `eyebite`
- `spell.js` - has handlers for `free_spell`, `fey_reinforcements`, `contact_patron`, `dragon_companion`, `spell_modifier`, `spell_thief`, `war_magic_cantrip`, `war_magic_spell`, `arcane_charge`, `guarded_mind`, `bulwark_of_force`, `signature_spells`, `spell_mastery`, `overchannel`, `pass_without_trace`, `warding_bond`, `minor_telekinesis_spell`, `sanctuary` - NO `eyebite`
- All other handler files - NO `eyebite`

### No router case
`src/services/combat/automation/automationRouter.js` has 680+ case entries but NO `eyebite` case. Falls through to `default` which pushes to `specialActions` without any actual effect logic.

### No target effect definition
`src/services/combat/conditions/targetEffectDefinitions.js` has NO `eyebite` entry for the three selectable effects (asleep/unconscious, panicked/frightened, sickened/poisoned).

## Expected Behavior (from manifest)
- Target within 60 ft makes WIS save
- On fail, caster chooses ONE effect for duration:
  - **Asleep**: Target gets Unconscious condition
  - **Panicked**: Target gets Frightened condition (must Dash away each turn)
  - **Sickened**: Target gets Poisoned condition
- On caster's subsequent turns, can target another creature (not one that saved)

## Root Cause
The `eyebite` automation type was added to spell JSON data but the corresponding handler was never implemented in the automation pipeline.

## Required Implementation
1. Add `eyebite` handler to `save.js` (similar to `confusion` - WIS save, single target, caster chooses effect)
2. Add `eyebite` case to `automationRouter.js` (should route to `actions`)
3. Add target effect definitions for `eyebite_asleep`, `eyebite_panicked`, `eyebite_sickened` to `targetEffectDefinitions.js`
4. Implement the modal UI for caster to choose which effect to apply (Asleep/Panicked/Sickened)
5. Implement the target effect logic (Unconscious, Frightened with Dash behavior, Poisoned)

## Related
- Similar multi-option save spells: `confusion` (WIS save, 4 random effects), `tashas_laughter` (WIS save, prone+incapacitated)
- Eyebite differs because the CASTER chooses the effect (not random), requiring a modal interaction
