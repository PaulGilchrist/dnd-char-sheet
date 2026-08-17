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
