# App Exploration Map

## Overview
D&D Character Sheet is a full-stack React 19 + Express 5 app for managing D&D 5e/2024 campaigns. Vite dev server on port 5173 proxies to Express on port 80.

## Main Sections/Pages

### 1. Campaign Selection (Dashboard)
- **URL**: `/` (when no campaign selected)
- **Heading**: "Select a Campaign"
- **Features**: Lists all campaigns as buttons, "Add" button to create new campaign
- **Identifiers**: `button:has-text("Select a Campaign")`, `button:has-text("Add")`

### 2. Character Sheet
- **View state**: `charSheet`
- **Features**: Full character display with abilities, actions, features, inventory
- **Buttons**: Edit, Delete, Upload, Download, Short Rest, Long Rest
- **Sections**: Summary (AC, HP, Speed, Gold, Proficiency, Initiative, Inspiration, Background, Allies), Abilities table, Actions table, Bonus Actions, Reactions, Features, Character Advancement
- **Identifiers**: Character name buttons in sidebar, `button:has-text("Short Rest")`, `button:has-text("Long Rest")`

### 3. Characters (Sidebar Submenu)
- **Features**: Lists characters in campaign, "Add Character" button
- **Wizard**: 17-step character creation wizard (Ruleset → Basic Info → Race → Subrace → Background → Class → Subclass → Feats → Ability Scores → Skill Proficiencies → Tool Proficiencies → Languages → Resistances → Spells → Magic Items → Inventory → Special Actions)
- **Note**: Step 1 "Ruleset" is missing in edit mode

### 4. Encounters (Encounter Builder)
- **View state**: `encounter`
- **Features**: Full encounter builder with monster database
- **Buttons**: Save encounter, Load encounter, Generate encounter
- **Components**: Party list (auto-populated from characters), Difficulty selector (Easy/Medium/Hard/Deadly), Monster search and filter (Type, Size, CR Min/Max), Monster table with checkboxes
- **Identifiers**: `heading:has-text("Encounter Builder")`, `combobox:has-text("Difficulty")`

### 5. Factions
- **View state**: `factions`
- **Features**: Faction management, New Faction form
- **Form fields**: Text fields with Preview buttons, Save/Cancel
- **Identifiers**: `button:has-text("New Faction")`, `input:has-text("Search factions")`

### 6. Initiative
- **View state**: `initiative`
- **Features**: Combat initiative tracker
- **Buttons**: Add (per creature, for effects), Clear, + NPC, Prev/Next (round navigation), Generate Loot
- **Identifiers**: `button:has-text("Clear")`, `button:has-text("+ NPC")`, `button:has-text("← Prev")`, `button:has-text("Next →")`, `button:has-text("Generate Loot")`

### 7. Maps
- **View state**: `mapsManager`
- **Features**: Map management, map list with actions
- **Buttons**: Create Map, Generate Dungeon, Open, Activate, Rename, Delete
- **Identifiers**: `button:has-text("Create Map")`, `button:has-text("Generate Dungeon")`

### 8. NPCs
- **View state**: `npcs`
- **Features**: NPC management, New NPC form, Generate NPC
- **Form fields**: Name (required), Race, Class/Role, Attitude (dropdown), Appearance, Personality, Goals, Secrets, Notes, Tags
- **Buttons**: New NPC, Generate NPC, Add to Initiative (per NPC), Edit NPC, Delete NPC
- **Identifiers**: `textbox:has-text("Name *")`, `button:has-text("Generate NPC")`, `button:has-text("Add to Initiative")`

### 9. Notes
- **View state**: `notes`
- **Features**: Campaign notes, markdown support
- **Form fields**: Text field with Preview button
- **Buttons**: New Note, Edit note, Save, Cancel
- **Identifiers**: `button:has-text("New Note")`, `input:has-text("Search notes")`

### 10. Quests
- **View state**: `quests`
- **Features**: Quest tracking
- **Form fields**: Text fields with Preview buttons
- **Buttons**: New Quest, Edit quest, Save, Cancel
- **Identifiers**: `button:has-text("New Quest")`, `input:has-text("Search Quests")`

### 11. Settlements
- **View state**: `settlements`
- **Features**: Settlement management, size filters
- **Buttons**: New Settlement, Generate Settlement, Village, Town, City, Metropolis, Add Service, Add NPC, Add Rumor
- **Identifiers**: `button:has-text("New Settlement")`, `button:has-text("Generate Settlement")`

### 12. Log (Campaign Log)
- **View state**: `campaignLog`
- **Features**: Dice roll and activity log
- **Components**: Log entries with timestamps, creature names, roll details, dice values
- **Identifiers**: `.campaign-tool.log-view`, `.log-entries`, `.log-entry`

### 13. Admin
- **View state**: `campaignRepair`
- **Features**: GM-only admin tools
- **Buttons**: Switch to Light Mode, Rename Campaign, Delete Campaign, Clear Change Data, Clear Campaign Log, Full Reset, Create Snapshot, Download Campaign, Rollback to Snapshot
- **Identifiers**: `button:has-text("Admin")`, `button:has-text("Delete Campaign")`

### 14. Rules
- **Behavior**: Opens external URL `https://paulgilchrist.github.io/dnd-tools/rules/general` in new tab
- **Not in routes config**: This is intentional external linking, not a missing view

### 15. Dice Roller
- **Location**: Bottom-left of sidebar
- **Dice**: d4, d6, d8, d10, d12, d20, d100
- **Behavior**: Opens popup overlay for dice rolls

## Key UI Patterns

### Form Validation
- Required fields marked with `*` (e.g., "Name *")
- Save buttons disabled when required fields are empty
- Delete actions show confirmation dialogs (`confirm` dialog for NPCs, `prompt` dialog for campaign deletion requiring exact name)

### Preview Mode
- Many text fields have "Switch to preview mode" / "Preview" buttons
- Toggles between edit and preview for Appearance, Personality, Goals, Secrets, Notes, etc.

### SSE Real-Time Sync
- **Endpoint**: `GET /subscribe?campaign=test-campaign` (Server-Sent Events)
- **Polling**: `GET /api/campaigns/:name/change-data` (in-memory cache polling, ~10s debounce)
- **Pattern**: ONE shared SSE connection per campaign (per docs)
- **Data flow**: Changes POSTed to server → broadcast via SSE → clients receive and update

### Navigation
- Single `activeView` state variable for mutually exclusive sidebar views
- Wizards are overlays that don't affect `activeView`
- Campaign selection uses `showCampaignSelection` boolean

### Sidebar Structure
```
- Campaign name (header)
- Character name (active indicator)
- Campaigns (button)
- Characters (section with submenu)
  - Add Character
  - [Character buttons]
- [Sidebar buttons per config]
- Rules (external link)
- [Settlements, Admin] (localhost only)
- Dice tray (footer)
```

## Reliable Selectors

| Element | Selector |
|---------|----------|
| Campaign buttons | `button:has-text("<campaign-name>")` |
| Sidebar navigation | `button:has-text("<view-name>")` |
| Save button (exact) | `button:has-text("Save")` with exact match |
| Cancel button | `button:has-text("Cancel")` |
| Close button (×) | `button:has-text("×")` |
| NPC name field | `textbox:has-text("Name *")` |
| Search inputs | `input:has-text("Search <type>")` or `textbox:has-text("Search <type>")` |
| Create Map | `button:has-text("Create Map")` |
| Generate NPC | `button:has-text("Generate NPC")` |
| Add to Initiative | `button:has-text("Add to Initiative")` |
| Dice buttons | `button:has-text("d20")`, `button:has-text("d4")`, etc. |
| Short Rest | `button:has-text("Short Rest")` |
| Long Rest | `button:has-text("Long Rest")` |

## Known Quirks & Gotchas

1. **Dice tray overlay blocks clicks** — The dice tray popup overlay (`dice-tray-popup-overlay`) intercepts pointer events and blocks clicks on elements behind it. Must press Escape or click the tray to dismiss.

2. **Create Map always disabled** — The "Create Map" button has `disabled=true` even when maps exist and the user should be able to create new ones.

3. **Duplicate accessible names** — Multiple "Add to Initiative" buttons (one per NPC) and ~101 "Add" buttons (one per effect slot per creature) share identical accessible names, causing ambiguity.

4. **Character wizard step numbering** — Edit mode starts at step 2 (Basic Information), missing step 1 (Ruleset).

5. **Two Save buttons** — NPC form has both "Save & Add to Initiative" and "Save" buttons. Use exact text match to distinguish.

6. **SSE connection reuse** — The app creates SSE connections to `/subscribe?campaign=<name>`. Multiple connections observed during exploration.

7. **change-data polling** — The `change-data` endpoint is polled frequently (every ~10s) for real-time sync.

8. **Rules is external** — The Rules sidebar button opens an external GitHub Pages site, not an in-app view.

9. **Admin/Settlements localhost-only** — These sidebar items only appear on localhost.

10. **Combat log spam** — The initiative page shows many repeated "Cleave Test Barbarian" entries, suggesting combat automation may be generating duplicate log entries.

## Session Findings — 2026-08-20

### Features Verified Working
- NPC creation, editing, and deletion with confirmation dialogs
- Character sheet display with all sections
- Short Rest / Long Rest buttons
- Encounter builder with monster database
- Initiative tracker with round navigation
- Settlement, Faction, Quest, and Note management
- Campaign creation flow
- Campaign rename and delete (with name-confirmation prompt)
- Dice roller (functional, though overlay issue)
- SSE real-time sync (connections established, change-data polling active)
- No console errors or failed network requests observed
