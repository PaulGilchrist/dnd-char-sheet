# Weapon Mastery E2E Test Findings

## Summary
- **Automation**: Weapon Mastery (ID: 3)
- **File**: `public/data/2024/classes.json`
- **Type**: `classes`
- **Source Type**: `weapon_kind_mastery`
- **Test File**: `tests/e2e/classes/weapon-mastery.spec.js`
- **Test Status**: ✅ PASSING (13/13 tests)
- **Date Tested**: 2026-08-20

## What Was Tested

### 1. Character Setup
- Created a level-20 Barbarian (Path of the Berserker) with 2024 rules
- Verified character summary shows "Barbarian (path of the berserker)"

### 2. Weapon Mastery Display
- Verified "Weapon Mastery: 4" appears in class features section
- Verified the number "4" is rendered as a clickable span with class "clickable"
- Level 20 Barbarian has `weapon_mastery: 4` (from classes.json level 20 entry)

### 3. Runtime Storage
- Verified weapon kinds can be set via runtime API (`_Weapon_Kind_Mastery_chosenWeapons`)
- Verified attack actions are available after setting weapon kinds

### 4. Combat Scenarios
- **Action attack (player vs NPC)**: Weapon Mastery visible, attacks available
- **Bonus action scenario**: Weapon Mastery visible, bonus actions section present
- **Reaction scenario**: Weapon Mastery visible, reactions section present
- **NPC attacks player**: Weapon Mastery visible, character summary correct
- **NPC action (NPC attacks)**: Weapon Mastery visible during NPC turn
- **Player vs player**: Weapon Mastery visible, character sheet loaded

### 5. Passive Behavior
- Verified Weapon Mastery is passive - no activation needed for attacks
- Feature remains visible throughout all combat scenarios
- Attack actions available (4 at level 20 with Extra Attack)

## Findings

### Expected Behavior (from JSON)
- Weapon Mastery is a `weapon_kind_mastery` with:
  - `meleeOnly: true` (Barbarian) or `false` (Fighter/Paladin/Ranger/Rogue)
  - `maxKinds: "class_level_scaling"` → 2 at level 1, 3 at level 4+, 4 at level 10+
  - `casting_time: "passive"`
- Should allow selecting weapon kinds via modal
- Mastery properties should apply passively when attacking with selected weapons

### Observed Behavior (UI)
- ✅ Level-20 Barbarian shows "Weapon Mastery: 4" in class features section
- ✅ The number "4" is rendered as a clickable span with class "clickable"
- ✅ Runtime value `_Weapon_Kind_Mastery_chosenWeapons` can be set via API
- ✅ Weapon Mastery feature remains visible and unchanged during all combat scenarios
- ✅ Attack actions are available (4 action attacks at level 20 with Extra Attack)
- ⚠️ No visible automation badge for Weapon Mastery on creature cards (passive feature, not a buff)

### Potential Issues

1. **Hardcoded `meleeOnly: false` in modal handler**: The `handleWeaponMasteryClick` function in `CharClassFeatures.jsx` hardcodes `meleeOnly: false` instead of reading from the feature's automation config. This means all classes see the non-melee-only weapon list, even Barbarians who should only see melee weapons. This is a code bug that may not be visible in testing since the modal still opens and works, but the filtering is incorrect.

2. **No visible automation badge**: Weapon Mastery does not display an automation badge on creature cards. Since it's a passive feature that stores selections in runtime, this may be expected behavior, but it makes it hard to verify the feature is active without checking the class features section.

## UI Flow Notes
- Weapon Mastery is rendered in the class features section (`CharClassFeatures.jsx`) as:
  ```jsx
  <div><b>Weapon Mastery: </b><span className="clickable" onClick={onWeaponMasteryClick}>{weaponMastery}</span></div>
  ```
- The clickable span triggers the `WeaponKindMasteryModal` component
- The modal shows checkboxes for weapon kinds (melee-only for Barbarian)
- Selections are stored in runtime as `_Weapon_Kind_Mastery_chosenWeapons`
- Mastery properties are applied automatically when attacking with matching weapon kinds
- Weapon mastery properties include: Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex

## Code References
- Feature definition: `public/data/2024/classes.json` line 63-72 (Barbarian)
- Modal handler: `src/components/char-sheet/char-summary/CharClassFeatures.jsx` line 665-672
- Modal component: `src/components/char-sheet/modals/WeaponKindMasteryModal.jsx`
- Handler: `src/services/automation/handlers/combat/weaponKindMasteryHandler.js`
- Automation info builder: `src/services/combat/automation/automationInfoBuilder/attack.js` line 154-169
- Passive collection: `src/services/combat/automation/automationPassives.js` line 89-96
