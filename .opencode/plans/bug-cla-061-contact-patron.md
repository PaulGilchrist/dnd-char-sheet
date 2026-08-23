# Bug: CLA-061 - Contact Patron Auto-Save Not Triggering

## Overview

The Contact Patron warlock feature (2024 rules, level 9) includes a `passive_rule` with effect `contact_patron_auto_save` that should auto-succeed the player's INT saving throw when casting Contact Other Plane. This passive rule is never being collected from the character's features, so the auto-save never triggers.

## Expected Behavior

When a 2024 Warlock with the Contact Patron invocation casts Contact Other Plane using the free cast feature:
1. The free_spell automation decrements the free cast count (works correctly)
2. The contact_patron_auto_save passive_rule is added to the player's automation.passives array
3. When the spell's damage is applied and an INT save is required, handlePlayerSaveDamage.js checks for the passive and auto-succeeds
4. The log entry should contain `note: 'contact_patron_damage_roll_before_apply'`
5. The popup should show `contactPatron: true` and `saveResult: { success: true, ... }`

## Actual Behavior

The free_spell automation works correctly (showing "Free Cast — no spell slot consumed"), and the dice roll for 6d6 Psychic damage is generated. However:
1. The contact_patron_auto_save passive_rule is NOT collected from the character's features
2. No log entry with `contact_patron_damage_roll_before_apply` is created
3. No save prompt appears (neither player-facing nor auto-succeed)
4. The damage is applied without the auto-save, meaning the player could take the full 6d6 damage and become Incapacitated

## Steps to Reproduce

1. Create a 2024 Warlock at level 9+ with Great Old One Patron subclass
2. The Contact Patron invocation should be automatically available at level 9
3. Navigate to the character's spell list
4. Click on "Contact Other Plane" spell
5. Click "Cast Spell" (should show "Free Cast — no spell slot consumed")
6. Observe: dice roll appears but no save prompt or auto-save log entry
7. Check the campaign log: no `contact_patron_damage_roll_before_apply` entry exists

## Likely Location

**Root cause:** `src/services/combat/automation/automationCollector.js`

The `collectAutomationFromFeatures` function has explicit handlers for specific passive_rule effects (`arcane_ward`, `arcane_apotheosis`, `spell_breaker`, `relentless`), but `contact_patron_auto_save` is not handled. When the generic `buildAttackInfo` path is reached, it looks up `DISPATCH['passive_rule']` which doesn't exist, returning `null` and skipping the automation entirely.

**Fix:** Add an explicit handler for `contact_patron_auto_save` in `automationCollector.js`, similar to the existing `relentless` handler:

```javascript
if (auto?.type === 'passive_rule' && auto?.effect === 'contact_patron_auto_save') {
    result.passives.push({
        type: 'passive_rule',
        name: feature.name,
        effect: 'contact_patron_auto_save',
        hasAutomation: true,
    })
    continue
}
```

**Related files:**
- Handler: `src/services/automation/handlers/classFeatureHandler.js`
- Router: `src/services/automation/routers/classFeatureRouter.js`
- InfoBuilder: `src/services/automation/infoBuilders/classFeatureInfoBuilder.js`
- Auto-save check: `src/hooks/combat/handlers/handlePlayerSaveDamage.js` (lines 121-180)

## Notes

- The Contact Patron feature in `public/data/2024/classes.json` defines TWO automations:
  1. `free_spell` type for Contact Other Plane (works correctly)
  2. `passive_rule` type with `effect: 'contact_patron_auto_save'` (broken - not collected)
- The `handlePlayerSaveDamage.js` code at lines 121-124 correctly checks for the passive:
  ```javascript
  const hasContactPatron = (context?.playerStats?.automation?.passives || []).some(
      p => p.type === 'passive_rule' && p.effect === 'contact_patron_auto_save'
  );
  ```
- The issue is purely that the passive never makes it into `playerStats.automation.passives`
- The test character ContactPatronWarlock (Level 9, Human, Warlock/Great Old One Patron, Soldier background, Savage Attacker feat) was created in test-campaign for verification
