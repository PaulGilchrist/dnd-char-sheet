# Exploratory Testing Notes — D&D Campaign Suite

**Started:** 2026-08-20
**Phase:** 1 - Learn the Game
**Test Campaign:** test-campaign

---

## App Overview

### Navigation Structure
- **Campaign Selection Screen:** Shows list of campaigns (Frostfall, Testing G1, Testing G2, Testing G3, test-campaign)
- **Sidebar Sections:**
  - Characters (with Add Character button)
  - Encounters
  - Factions
  - Initiative (combat)
  - Log (combat log)
  - Maps
  - NPCs
  - Notes
  - Quests
  - Rules (external link)
  - Settlements
  - Admin (GM only)
- **Dice Tray:** d4, d6, d8, d10, d12, d20, d100

### Character Sheet Sections (when viewing a character)
- **Header:** Avatar, name, Edit/Delete/Upload/Download buttons, Short Rest/Long Rest buttons
- **Summary Grid:** AC, HP, Speed, Gold, Proficiency, Initiative, Inspiration, Background, Feats, Allies
- **Abilities Table:** STR, DEX, CON, INT, WIS, CHA with scores, bonuses, saves, and skills
- **Actions:** Weapons and spells (grouped by type)
- **Bonus Actions:** Separate section
- **Reactions:** Separate section
- **Spells:** Spell slots, spell list by level
- **Inventory:** Equipped items, backpack items
- **Special Actions:** Class features, racial traits

---

## Data Flow Understanding

### How Automations Work
1. **Raw Character Data:** Stored as JSON files in `public/campaigns/:name/`
   - Contains: name, level, class, race, abilities, feats, inventory, languages, etc.
   - Does NOT contain: computed actions, spells, features, automations

2. **Client-Side Computation:** When a character is loaded:
   - Frontend calls `rulesFactory.getPlayerStats()` with raw character data + rules data
   - Rules engine processes:
     - Class features → actions/bonusActions/reactions
     - Spells → spell list with slots
     - Feats → features with automation metadata
     - Race → traits, immunities, resistances
     - Magic items → buffs, special abilities
   - Result stored in `computedStats` on the character object

3. **Automation Collection:**
   - `collectAutomationFromFeatures()` scans all features for automation metadata
   - Creates `playerStats.automation` object with:
     - `actions`: Attack riders, spell casters
     - `bonusActions`: Bonus action attack riders
     - `reactions`: Reaction handlers (Shield, Opportunity Attack, etc.)
     - `passives`: Passive buffs, resistances, immunities
     - `specialActions`: Free spells, resource management
     - `turnStartEffects`: Effects that trigger at turn start

4. **Runtime Store:**
   - Computed tracked resources are seeded into a per-character runtime store
   - Server change-data provides persistent overrides (HP changes, conditions, etc.)
   - SSE broadcasts changes to all connected clients

### Key Files
- `src/services/rules/rules.js` - Core rules engine
- `src/services/rules/rulesFactory.js` - Factory that loads correct ruleset
- `src/services/combat/automation/automationService.js` - Automation collection
- `src/services/automation/` - All automation handlers (200+)
- `server/routes/campaigns-character.js` - Character CRUD API
- `server/utils/changeData.js` - In-memory cache → disk persistence

---

## Test-Campaign State

### Characters Created
1. **Test Warrior** (Level 5 Fighter/Battle Master, 2024 rules)
   - STR 17, DEX 10, CON 14
   - Feats: Second Wind
   - Fighting Style: Great Weapon Fighting
   - Equipment: Longsword, Chain Mail, Shield
   - Background: Soldier

2. **Test Rogue** (Level 5 Rogue/Thief, 2024 rules)
   - DEX 20, CON 14, INT 12
   - Feats: Uncanny Dodge
   - Equipment: Shortsword, Leather Armor
   - Background: Criminal

3. **Test Sorcerer** (Level 10 Sorcerer/Draconic Bloodline, 2024 rules)
   - CHA 20, DEX 14, CON 14
   - Feats: Metamagic
   - Equipment: Dagger
   - Background: Charlatan

### Existing Characters (from server)
- **Lyra Starweave** (Level 20 Wizard/Abjurer, 5e rules) - Drow
- **Sage Whisperwind** (Level 20, 5e rules)
- **Thorin Ironforge** (Level 20 Fighter/Eldritch Knight, 2024 rules)

### Test-Campaign is Clean
- No encounters
- No NPCs
- No maps
- No combat log entries
- No factions or quests

---

## Bugs Found

### Bug 1: Character UI Not Updating on URL Change
- **Issue:** When navigating directly to `/#/campaign/test-campaign/character/Test_Warrior`, the URL shows "Test Warrior" but the UI still displays "Lyra Starweave"
- **Evidence:** Browser URL changed, sidebar shows "Test Warrior" as active, but character sheet shows Lyra's data (AC 9, HP 62/62, Drow Wizard Level 20)
- **Impact:** Users may see wrong character data when using direct links or bookmarks
- **Severity:** Medium - confusing UX but doesn't break core functionality

### Bug 2: URL Changes Not Triggering Component Re-renders
- **Issue:** When navigating to different URLs (e.g., `/log`, `/maps`), the URL changes in the browser but the UI continues showing the previous component (Encounter Builder)
- **Evidence:** URL changed to `/#/campaign/test-campaign/log` and `/#/campaign/test-campaign/maps` but page content still shows encounter builder
- **Impact:** Users cannot navigate between different sections of the app
- **Severity:** Critical - app navigation is broken
- **Possible cause:** React Router not properly handling hash-based routing, or state management preventing re-renders

### Bug 3: Encounter Builder Not Updating Summary
- **Issue:** Checking monster checkboxes (Goblin, Goblin Boss, Goblin Hexer, Goblin Minion, Goblin Warrior) doesn't update the encounter summary
- **Evidence:** 5 goblin variants are checked but summary shows "Total XP: 0, Monster Count: 0, Effective XP: 0"
- **Impact:** Users can't build encounters properly - can't see XP totals or difficulty
- **Severity:** High - core encounter building functionality broken
- **Possible cause:** React state not syncing with checkbox changes, or event handler not firing

---

## Initial Observations

### Strengths
- Clean, organized sidebar navigation
- Good separation of concerns (actions/bonusActions/reactions)
- Rules engine handles both 5e and 2024 rulesets
- Automation system is extensive (200+ handlers)
- Encounter builder has good UI with search, filters, and difficulty calculation

### Areas to Explore Further
- How does the combat system work?
- How do automations trigger during combat?
- What happens when multiple automations fire simultaneously?
- How does the UI handle automation feedback?
- What edge cases exist in the rules engine?

---

## API Endpoints Explored

### Character Endpoints
- `GET /api/campaigns/:campaign/:file` - Get character data
- `POST /api/campaigns/:campaign` - Create character
- `PUT /api/campaigns/:campaign/:file` - Update character
- `DELETE /api/campaigns/:campaign/:file` - Delete character

### Combat Endpoints
- `GET /api/campaigns/:campaign/combatSummary` - Get combat summary
- `POST /api/campaigns/:campaign/pipeline-event` - Record pipeline event
- `GET /api/campaigns/:campaign/pipeline-events` - Get pipeline events

### Other Endpoints
- `GET /api/campaigns/:campaign/encounters` - Get encounters
- `GET /api/campaigns/:campaign/npcs` - Get NPCs
- `GET /api/campaigns/:campaign/log` - Get combat log
- `GET /api/campaigns/:campaign/maps` - Get maps
- `GET /api/campaigns/:campaign/notes` - Get notes
- `GET /api/campaigns/:campaign/quests` - Get quests
- `GET /api/campaigns/:campaign/factions` - Get factions
- `GET /api/campaigns/:campaign/settlements` - Get settlements
- `GET /api/campaigns/:campaign/change-data` - Get runtime state

---

## Next Steps
1. Explore combat system (initiative, attacks, spells)
2. Test automations in combat scenarios
3. Explore encounter builder in more detail
4. Test edge cases (conditions, terrain, multi-target)
5. Check UI consistency and feedback
