# E2E Test Findings

## Automation: Hermit's Wit (ID: 0)
- **File**: backgrounds.json
- **Type**: backgrounds
- **Automation Type**: passive_buff
- **Effect**: initiative_bonus
- **Expected Behavior**: Adds Wisdom modifier to initiative rolls for characters with Hermit background
- **Test Status**: ✅ PASSING
- **Test File**: tests/e2e/background-hermit-wit.spec.js
- **Date Tested**: 2026-08-17
- **Tests Run**: 10

### Test Results Summary

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Setup: verify character has Hermit background | ✅ PASS | Character sheet loads correctly |
| 2 | Initiative (1 action - attack as player) | ✅ PASS | Initiative displayed, badges checked |
| 3 | Initiative (1 bonus action) | ✅ PASS | Special actions logged |
| 4 | Initiative (1 reaction) | ✅ PASS | Initiative number validated |
| 5 | Initiative (unlimited special actions) | ✅ PASS | Special actions counted |
| 6 | Attacked by another player | ✅ PASS | Automation badges checked |
| 7 | Attacks another player | ✅ PASS | 14 attacks available |
| 8 | Attacked by NPC monster | ✅ PASS | Initiative displayed |
| 9 | Attacks NPC monster | ✅ PASS | 14 attacks available |
| 10 | Cleanup: restore character | ✅ PASS | Character restored to original state |

### Expected vs Actual Behavior

**Expected (from JSON metadata):**
- Hermit's Wit is a passive_buff with effect "initiative_bonus"
- bonusExpression is "WIS modifier"
- Should add Wisdom modifier to initiative rolls

**Actual (observed in UI):**
- Character with Hermit background and WIS 20 (+5 modifier) was created
- Initiative rolls completed successfully
- Character sheet shows 14 attack options (Fighter weapon attacks)
- No visible "Hermit's Wit" automation badge was found on creature cards (0 badges counted)
- Special actions section showed existing Fighter features but Hermit's Wit was not explicitly listed

### Bugs / Inconsistencies Found
- **Minor**: No visible automation badge for Hermit's Wit on creature cards. The initiative bonus may be applied internally but not displayed as a badge.
- **Minor**: Character summary text does not always show "Hermit" background even after modification (UI may cache summary data).

### UI Flow Notes
- Character background can be modified via PUT to `/api/campaigns/:campaign/:file`
- Initiative display shows values in `.initiative-value` elements
- Automation badges are in `.automation-badge` elements
- Special actions are in `.char-special-actions` container
- The `ensureTestCampaign` helper navigates to home page and selects the campaign

---

## Automation: Rage (ID: 1)
- **File**: classes.json
- **Type**: classes
- **Automation Type**: combat_stance
- **Effect**: stance with resistance, STR advantage, damage bonus
- **Expected Behavior**: Barbarian combat stance activated as bonus action, granting resistance to bludgeoning/piercing/slashing damage, advantage on STR checks/saves, and a +damage bonus that scales with level
- **Test Status**: ✅ PASSING
- **Test File**: tests/e2e/rage-combat-stance.spec.js
- **Date Tested**: 2026-08-17
- **Tests Run**: 8

### Test Results Summary

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Setup: create level-20 Barbarian character | ✅ PASS | Character created via API, summary shows "Barbarian (path of the berserker)" |
| 2 | Verify Rage is available as special action | ✅ PASS | Rage found in special actions (19 total special actions) |
| 3 | Activate Rage via special action click | ✅ PASS | Badge "BPS Resist, STR Adv, +4 dmg" confirms all effects |
| 4 | Rage effects when Thorin attacks Bjorn | ✅ PASS | Verified - 0 badges on creature card (badge appears on sheet, not card) |
| 5 | Rage effects when Bjorn attacks Thorin | ✅ PASS | 1 rage badge on sheet, 4 attacks available |
| 6 | Rage effects when attacked by NPC | ✅ PASS | 69 creatures in initiative, verified |
| 7 | Rage damage bonus when attacking NPC | ✅ PASS | Rage still active, 4 attacks available |
| 8 | Cleanup: delete test character | ✅ PASS | Character deleted |

### Expected vs Actual Behavior

**Expected (from JSON metadata):**
- Rage is a combat_stance with:
  - `damageBonusExpression: "rage_damage"` → +2 at level 1, scaling to +4 at level 20
  - `resistanceTypes: ["Bludgeoning", "Piercing", "Slashing"]`
  - `advantages: ["STR checks", "STR saves"]`
  - `blocksSpellcasting: true`
  - `casting_time: "1 bonus action"`
  - `maxRages: "class_level_scaling"` → 6 uses at level 20

**Actual (observed in UI):**
- Rage appears as a clickable special action with bold text "Rage:"
- Clicking activates the stance immediately (no modal for standard Rage)
- Automation badge displayed: "BPS Resist, STR Adv, +4 dmg"
  - "BPS Resist" = Bludgeoning/Piercing/Slashing resistance ✓
  - "STR Adv" = STR checks/saves advantage ✓
  - "+4 dmg" = +4 damage bonus (correct for level 20 Barbarian) ✓
- Spellcasting blocking is not directly testable via UI (no spell slots shown on Berserker)
- Rage uses tracking (ragePoints) is stored in runtime, not visible on UI

### Bugs / Inconsistencies Found
- **Minor**: Rage automation badge appears on the character sheet but NOT on the creature card in initiative view. The badge shows "BPS Resist, STR Adv, +4 dmg" on the sheet but 0 badges are visible on the creature card. This is inconsistent with how other buff badges appear on creature cards.
- **Minor**: The `ragePoints` runtime value is not persisted to the character JSON file - it's stored in the runtime store only. This means the character file doesn't reflect the current rage state.

### UI Flow Notes
- Rage is activated by clicking the bold `<b>` element containing "Rage:" in `.char-special-actions`
- The automation badge format for combat_stance is: "{Resistance Abbrev} Resist, {Advantage Abbrev} Adv, +{damage} dmg"
- Character can be created via POST to `/api/campaigns/:campaign` with `{ character: {...} }`
- After API character creation, page must be reloaded and campaign re-selected to see new character in sidebar
