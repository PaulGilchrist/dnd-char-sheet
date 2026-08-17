## E2E Testing Findings

### Test Campaign Setup

**Campaign:** `test-campaign`
**Location:** `public/campaigns/test-campaign/`
**Characters Created:**
1. **Thorin Ironforge** - Human Variant Fighter (Eldritch Knight) - Level 20 - 2024 Ruleset
2. **Lyra Starweave** - High Elf Wizard (Evocation) - Level 20 - 2024 Ruleset

### Key UI Discoveries

1. **Modal-heavy architecture:** The app uses hundreds of modals that gate user progression. Users must press Escape repeatedly to close them.

2. **Campaign filtering:** The `test-campaign` was previously filtered out from the UI by both:
   - Server-side: `server/routes/campaigns-basic.js` (line 12)
   - Client-side: `src/services/campaign/campaignService.js` (line 9)
   Both filters have been removed.

3. **2024 Ruleset quirks:**
   - Ruleset selection uses clickable divs with headings, not radio buttons
   - Subrace step for Human shows all races instead of subraces (data loading issue)
   - Step ordering differs slightly from 5e

4. **Wizard navigation:** 17-step wizard with sidebar navigation. Can navigate via sidebar tabs or Next/Previous buttons.

### Automation Categories to Test

| Category | Character | Features |
|----------|-----------|----------|
| Class | Fighter (Eldritch Knight) | Action Surge, Second Wind, Spellcasting, Eldritch Weapon |
| Class | Wizard (Evocation) | Cantrips, Sculpt Spells, Empowered Evocation, Overchannel |
| Race | Human Variant | Extra language, variant trait |
| Race | High Elf | Extra language, Fey Ancestry, Trance |
| Background | Soldier | Military Rank, Athletics, Intimidation |
| Background | Sage | Researcher, Arcana, History |

### Combat E2E Test Flow

1. Navigate to Initiative (sidebar → "Initiative")
2. Add NPCs (click "+ NPC", search creature)
3. Roll Initiative (click button on character sheet)
4. Take turns:
   - Action: Click attack → select target → confirm
   - Bonus Action: Click bonus action → select target if needed
   - Reaction: Click reaction → select trigger
   - Special: Class features, feats
5. Validate:
   - Damage applied correctly
   - Conditions applied
   - Resource pools decremented
   - Log entries created

### Code Changes Made

| File | Change |
|------|--------|
| `server/routes/campaigns-basic.js` | Removed `test-campaign` filter from API |
| `src/services/campaign/campaignService.js` | Removed `test-campaign` filter from client |

### Playwright Configuration

- **Browser:** Chromium (changed from WebKit)
- **Timeout:** 10000ms per test
- **Screenshots:** `tests/e2e/screenshots/`
- **Tests:** `tests/e2e/`

### Test Status

| Test File | Status |
|-----------|--------|
| `setup.spec.js` | ✅ PASSES - Creates campaign and 2 level-20 characters |
| `combat-initiative.spec.js` | ⏳ TODO |
| `combat-automation.spec.js` | ⏳ TODO |
| `class-features.spec.js` | ⏳ TODO |
| `race-features.spec.js` | ⏳ TODO |
| `background-features.spec.js` | ⏳ TODO |
| `feat-features.spec.js` | ⏳ TODO |

### Test Results

| Test File | Status | Notes |
|-----------|--------|-------|
| `setup.spec.js` | ✅ PASSES | Creates test-campaign, 2 level-20 characters (2024 ruleset) |
| `combat-initiative.spec.js` (NPCs) | ✅ PASSES | Navigates to initiative, adds NPCs |
| `combat-initiative.spec.js` (Char Sheet) | ✅ PASSES | Navigates to char sheet, logs actions |

### Key UI Discoveries (Combat)

1. **"+ NPC" button** adds a generic "NPC 1", "NPC 2", etc. - not a search modal
2. **NPC names** can be edited by clicking on the creature name (shows input field)
3. **Character sheet** uses `.char-header .name` for character name
4. **Action sections** are labeled: Abilities, Actions, Bonus Actions, Reactions, Spells, Inventory, Special Actions, Character Advancement
5. **2024 Fighter (Eldritch Knight)** shows as "Human, Fighter (eldritch knight), Level 20 (milestone)"

### Remaining Work

1. Test attack automation (clicking attacks, selecting targets)
2. Test spell casting automation
3. Test class features (Action Surge, Second Wind, etc.)
4. Test race features (Fey Ancestry, Trance, etc.)
5. Test background features
6. Test feat automation
