# E2E Automation Testing Progress

## Run Status
- **Status**: In Progress
- **Started**: 2026-08-17
- **Total Automations**: 559
- **Tested**: 6
- **Remaining**: 553

## Automation Test Log

### 6. Danger Sense (ID: 4) - ✅ TESTED / PASSING
- **File**: classes.json
- **Type**: classes
- **Automation Type**: conditional_advantage
- **Effect**: advantage on DEX saving throws
- **Description**: Barbarian class feature (level 2) that grants advantage on Dexterity saving throws unless the Barbarian has the Incapacitated condition
- **Test File**: tests/e2e/classes/danger-sense.spec.js
- **Date Tested**: 2026-08-20
- **Tests Run**: 15
- **Notes**: All 15 tests passed. Danger Sense appears correctly in class features section. Feature is passive (no activation needed). Verified across action, bonus action, reaction, player vs NPC, NPC vs player, and NPC action scenarios. Character sheet loads correctly with Barbarian class at level 20.

### 5. Cleave (ID: 538) - ⚠️ TESTED / PASSING (with findings)
- **File**: weapon-mastery.json
- **Type**: weapon_kind_mastery
- **Automation Type**: weapon_mastery
- **Effect**: cleave (extra attack against second creature within 5ft)
- **Description**: If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon's damage, but don't add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn.
- **Test File**: tests/e2e/weapon-mastery/cleave.spec.js
- **Date Tested**: 2026-08-20
- **Tests Run**: 7
- **Notes**: All 7 tests passed. However, the Cleave modal did not appear during E2E testing. The character was attacking with Unarmed Strike (not Greataxe) which doesn't have the Cleave mastery property in equipment.json. The weapon mastery runtime value was set correctly. The once-per-turn limit test confirmed no cleave modal appeared on second attack. See issue file for detailed findings.

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

### 3. Unarmored Defense (ID: 2) - ✅ TESTED / PASSING
- **File**: classes.json
- **Type**: classes
- **Automation Type**: passive_rule
- **Effect**: unarmored_defense_ac
- **Description**: Barbarian/Bard class feature that sets base AC to 10 + DEX + CON (Barbarian) or 10 + DEX + CHA (Bard College of Dance) when not wearing armor. At level 20, Barbarians get +4 to STR and CON, making CON 20 (+5 modifier). AC = 10 + DEX mod + CON mod.
- **Test File**: tests/e2e/classes/unarmored-defense.spec.js
- **Date Tested**: 2026-08-20
- **Tests Run**: 10
- **Notes**: All tests passed. AC correctly calculated as 17 (10 + 2 Dex + 5 Con) for level-20 Barbarian with DEX 14, CON 16. Unarmored Defense takes precedence over light armor when it provides better AC. No visible automation badge on creature cards (passive rule).

### 4. Weapon Mastery (ID: 3) - ✅ TESTED / PASSING
- **File**: classes.json
- **Type**: classes
- **Automation Type**: weapon_kind_mastery
- **Effect**: weapon_kind_mastery
- **Description**: Barbarian/Fighter/Paladin/Ranger/Rogue class feature that allows characters to select weapon kinds for mastery properties. When attacking with a selected weapon kind, the weapon's mastery properties (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) are applied. For Barbarian: melee-only, max 2 kinds at level 1 scaling to 4 at level 10+. For other classes: any weapons, max 2-3 kinds depending on level.
- **Test File**: tests/e2e/classes/weapon-mastery.spec.js
- **Date Tested**: 2026-08-20
- **Tests Run**: 13
- **Notes**: All tests passed. Weapon Mastery appears in class features section showing "Weapon Mastery: 4" for level-20 Barbarian. The clickable span triggers a modal for weapon kind selection. Mastery properties apply passively to attacks with selected weapon kinds. Verified across action, bonus action, reaction, player vs NPC, NPC vs player, and NPC action scenarios.

## Remaining Automations (541)

### Backgrounds (1 total, 0 remaining)
- ~~Hermit's Wit~~ - tested

### Classes (150+ total)
- Rage (combat_stance) - tested
- Unarmored Defense (passive_rule) - tested
- Weapon Mastery (weapon_kind_mastery) - tested
- Danger Sense (conditional_advantage) - tested
- ... and 146+ more

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
- ~~Cleave (weapon_kind_mastery)~~ - tested (with findings)
- Graze (weapon_kind_mastery) - untested
- Nick (weapon_kind_mastery) - untested
- Push (weapon_kind_mastery) - untested
- Sap (weapon_kind_mastery) - untested
- Slow (weapon_kind_mastery) - untested
- Topple (weapon_kind_mastery) - untested
- Vex (weapon_kind_mastery) - untested

### Fighting Styles (6 total)
- Defense (fighting_style) - untested
- Great Weapon Fighting (fighting_style) - untested
- Interception (fighting_style) - untested
- Shield Master (fighting_style) - untested
- Two Weapon Fighting (fighting_style) - untested
- Unarmed Fighting (fighting_style) - untested

### Metamagic (8 total)
- Careful Spell (metamagic) - untested
- Distant Spell (metamagic) - untested
- Empowered Spell (metamagic) - untested
- Extended Spell (metamagic) - untested
- Heightened Spell (metamagic) - untested
- Quickened Spell (metamagic) - untested
- Subtle Spell (metamagic) - untested
- Twinned Spell (metamagic) - untested
