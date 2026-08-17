# D&D Campaign Suite - E2E Exploration Findings

## App Architecture

- Full-stack React 19 + Express 5 app
- Vite dev server on port 5173, Express API on port 80
- Vite proxies `/api`, `/subscribe`, `/spell-overlay` to Express
- Playwright configured: Chromium only, base URL http://localhost:5173
- Tests in `tests/e2e/` with shared helpers in `tests/e2e/helpers.js`

## UI Structure

### Navigation
- **Campaign Selection**: Landing page with campaign list + "Add" button
- **Sidebar**: `.sidebar` container with:
  - `.sidebar-link` for character names (click to navigate to character sheet)
  - `.sidebar-link.add-character` for "Add Character" button
  - `.sidebar-section-header` for section headers (Campaigns, Encounters, Factions, Initiative, Log, Maps, NPCs, Notes, Quests, Rules, Settlements, Admin)
  - Dice buttons: `.dice-btn` (4d4, d6, 8d8, 10d10, 12d12, d20, %d100)
  - Initiative button: `.sidebar-section-header` with text "Initiative"
  - Encounter button: `.sidebar-section-header` with text "Encounter"

### Character Sheet (`CharSheet.jsx`)
- Container class: `.char-sheet`
- Character summary: `[data-testid="char-summary-text"]` shows race, class, level, alignment
- Sections (`.sectionHeader`):
  1. **Abilities** - Ability scores, modifiers, skills
  2. **Actions** - Weapon attacks, action spells, class features
  3. **Bonus Actions** - Bonus action attacks, spells, features
  4. **Reactions** - Reaction spells, opportunity attacks, features
  5. **Spells** - Spell slots, spell list
  6. **Inventory** - Equipment, gold pieces
  7. **Special Actions** - Class features, passives
  8. **Character Advancement** - Level-ups, feat selections
- Top buttons: Edit, Delete, Upload, Download, Short Rest, Long Rest
- Attack rows: `.attacks` container with columns: Name, Level, Range, Hit, Damage, Type

### Action Rendering
- **Actions**: `.char-actions > .sectionHeader` = "Actions", then `.attacks` container
  - Each attack: `<div className='left clickable'>` for name, clickable hit bonus, clickable damage
  - Clicking attack name triggers `handleAttackClick()` → attack roll + damage automation
  - Clicking damage triggers `handleSimpleDamageRoll()` or `resolveSpellDamage()`
- **Bonus Actions**: Same `.attacks` pattern, rendered by `CharBonusActions.jsx`
- **Reactions**: Same pattern, rendered by `CharReactions.jsx`
- **Special Actions**: `.char-special-actions > .sectionHeader` = "Special Actions"
  - Clickable features trigger `handleAutomationClick()` → `executeHandler()`

### Initiative View (`initiative.jsx`)
- Container: `.initiative`
- Creature cards: `.creature-card` with classes `player`/`monster`, `active` when current turn
  - `.creature-name` for name display/edit
  - `.creature-hp` for HP display
  - `.creature-ac` for AC display
  - `.creature-badge` for condition/effect badges
- Controls: "Next →", "← Prev", "Roll Initiative" buttons
- NPC button: `+ NPC` button
- Round indicator: `h4` with "round" text

### Character Creation Wizard
- Overlay: `.character-creation-wizard-overlay`
- Sidebar tabs: `.sidebar-tab` with `.sidebar-tab-title` and `.sidebar-tab-number`
- Steps: Ruleset → Basic Info → Race → Subrace → Background → Class → Subclass → Resistances → Feats → Ability Scores → Skills → Tools → Languages → Spells → Magic Items → Inventory → Special Actions → Save
- Labels: "Character Name *", "Level *", "Race *", "Subrace *", "Background *", "Class *", "Subclass / Major *"
- Final step: "Create Character" button

## Automation Categories

### Class Features (Fighter - Eldritch Knight)
- Weapon attacks (Longsword, Warhammer, etc.)
- Spell attacks (Eldritch Blast, Magic Missile, etc.)
- Second Wind (reaction healing)
- Action Surge (special action - extra action)
- Eldritch Strike (special action)
- Eldritch Knight spellcasting
- Epic Boon (level 20 milestone)

### Race/Subrace (Human/Elf)
- Human: +1 to all ability scores, extra feat
- Elf: Darkvision, Fey Ancestry, Trance

### Background (Soldier/Sage)
- Skill proficiencies (Athletics/History)
- Tool proficiencies
- Feature (Soldier: Military Rank, Sage: Researcher)

### Feats (Actor/Artillerist)
- Actor: Speak languages, mimic sounds/voices, fake injuries
- Artillerist: Eldritch Cannon (action to summon, attack as bonus action)

## Combat Flow

1. Navigate to Initiative view
2. Add NPCs or use existing characters
3. Click "Roll Initiative" → initiative order calculated
4. Use "Next →" / "← Prev" to navigate turns
5. On character's turn:
   - Click attack name to roll attack + auto-damage + automation triggers
   - Click damage to roll damage without attack
   - Click class features for automation
   - Click spells to cast with target selection

## Key Selectors

| Element | Selector |
|---------|----------|
| Character link | `getByRole('button', { name: 'Character Name' })` or `.sidebar-link` with text |
| Character sheet | `.char-sheet` |
| Section header | `.sectionHeader` |
| Attacks container | `.attacks` |
| Attack name | `.attacks .left.clickable` or `.attacks .left` |
| Hit bonus | `.attacks > div:nth-child(4)` in attack row |
| Damage | `.attacks > div:nth-child(5)` in attack row |
| Initiative | `.initiative` |
| Creature card | `.creature-card` |
| Creature name | `.creature-name` |
| Next turn | `getByRole('button', { name: 'Next →' })` |
| Prev turn | `getByRole('button', { name: '← Prev' })` |
| Roll initiative | `getByRole('button', { name: 'Roll Initiative' })` |
| Add NPC | `getByRole('button', { name: '+ NPC' })` |
| Sidebar tabs | `.sidebar-tab` |
| Wizard overlay | `.character-creation-wizard-overlay` |

## Test Campaign Characters

### Thorin Ironforge (2024 Ruleset)
- Human Fighter (Eldritch Knight) Level 20
- STR 20, DEX 16, CON 16, INT 10, WIS 8, CHA 8
- Feats: Actor
- Ruleset: 2024 (Essentials)

### Lyra Starweave (2024 Ruleset)
- Elf Wizard (Evocation) Level 20
- STR 8, DEX 14, CON 13, INT 20, WIS 16, CHA 10
- Feats: Artillerist
- Ruleset: 2024 (Essentials)

## Expected vs Actual Behavior Notes

### Character Sheet
- Actions section shows weapon attacks with clickable hit/damage
- Bonus Actions section shows bonus action attacks and spells
- Reactions section shows opportunity attacks and reaction spells
- Special Actions shows class features with automation badges
- All sections use `.sectionHeader` for titles

### Combat
- Initiative view shows all creatures in order
- Active creature card gets `.active` class
- Turn navigation updates active creature
- Attack clicks trigger full automation pipeline

### Known Issues to Test
- Multiple EventSources for SSE (use `subscribeToSSE` instead)
- Route order matters (character routes before changedata)
- 5MB JSON body limit for image uploads
- Server-first pattern: use `useSyncedState`/`setRuntimeObject` with `skipSync=true`

## E2E Test Results

### Tests Created: `tests/e2e/automation-tests.spec.js`
8 tests covering:
1. **Setup** - Verify characters exist and add NPCs
2. **Player vs NPC combat** - Thorin attacks Bugbear (action automation)
3. **Wizard verification** - Lyra character sheet with spell automation
4. **Turn navigation** - Initiative forward/backward, round tracking
5. **NPC structure** - Creature card classes, target setting, badges
6. **NPC attacks player** - Reaction verification (Opportunity Attack)
7. **Full encounter** - All creature types, full round navigation
8. **Sheet structure** - All sections, action containers, special actions

### Test Results: 8/8 passed

### Notes from Test Runs
- Creature names in initiative may be concatenated (e.g., "BugbearBugbear Chief...") - this is a UI rendering issue where creature names span multiple lines
- NPCs use class `npc` not `monster` on creature cards
- Thorin has 14 attack items in Actions section (weapon attacks + spell attacks)
- Thorin has 9 special actions (Eldritch Strike, Indomitable, Resourceful, Studied Attacks, Tactical Master, Tactical Mind, War Bond, Weapon Mastery)
- Lyra (Drow Wizard Abjurer) has 6 reaction items and 1 automation badge
- All character sheets have 8 sections: Abilities, Actions, Bonus Actions, Reactions, Spells, Inventory, Special Actions, Character Advancement
- 3 action containers per character sheet (Actions, Bonus Actions, Reactions)
- 3 attack containers per character sheet
