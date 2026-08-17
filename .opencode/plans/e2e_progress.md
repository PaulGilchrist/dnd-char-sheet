# E2E Automation Testing Progress

## Run Status
- **Status**: In Progress
- **Started**: 2026-08-17
- **Total Automations**: 538
- **Tested**: 2
- **Remaining**: 536

## Automation Test Log

### 1. Hermit's Wit (ID: 0) - ✅ TESTED / PASSING
- **File**: backgrounds.json
- **Type**: backgrounds
- **Automation Type**: passive_buff
- **Effect**: initiative_bonus
- **Description**: Hermit background feature that adds WIS modifier to initiative rolls
- **Test File**: tests/e2e/background-hermit-wit.spec.js
- **Date Tested**: 2026-08-17
- **Tests Run**: 10
- **Notes**: All tests passed. Initiative bonus applied correctly. No visible automation badge found on creature cards.

### 2. Rage (ID: 1) - ✅ TESTED / PASSING
- **File**: classes.json
- **Type**: classes
- **Automation Type**: combat_stance
- **Effect**: stance with resistance, STR advantage, damage bonus
- **Description**: Barbarian combat stance - bonus action to enter rage, granting resistance to bludgeoning/piercing/slashing, advantage on STR checks/saves, and +damage bonus
- **Test File**: tests/e2e/rage-combat-stance.spec.js
- **Date Tested**: 2026-08-17
- **Tests Run**: 8
- **Notes**: All tests passed. Rage activates via special action click. Badge shows "BPS Resist, STR Adv, +4 dmg" confirming all three effects (resistance, STR advantage, +4 damage at level 20).

## Remaining Automations (536)

### Backgrounds (1 total, 0 remaining)
- ~~Hermit's Wit~~ - tested

### Classes (150+ total)
- Rage (combat_stance) - untested
- Unarmored Defense (passive_rule) - untested
- Weapon Mastery (weapon_kind_mastery) - untested
- ... and 147+ more

### Feats (100+ total)
- Ability Score Improvement - untested
- Actor - untested
- ... and 98+ more

### Races (80+ total)
- Aasimar traits - untested
- Dragonborn traits - untested
- ... and 78+ more

### Spells (200+ total)
- Acid Splash - untested
- Aid - untested
- ... and 198+ more

### Maneuvers (20 total)
- Ambush - untested
- Bait and Switch - untested
- ... and 18+ more

### Weapon Mastery (8 total)
- Cleave - untested
- Graze - untested
- ... and 6+ more
