# Bug: SP-043 Faerie Fire - Spell Casting Target Selection Fails

## Summary
Faerie Fire spell casting automation (SP-043) fails to apply the glowing/advantage effect when selecting a target. The target selection modal closes without completing the spell cast, and no faerie-fire effect is applied to the target.

## Environment
- **Automation ID:** SP-043
- **Spell:** Faerie Fire (Level 1, Evocation, Bard/Druid)
- **Handler:** `src/services/combat/automation/handlers/spellHandler.js`
- **Router:** `src/services/combat/automation/routers/spellRouter.js`
- **InfoBuilder:** `src/services/combat/automation/infoBuilders/spellInfoBuilder.js`
- **Character:** Bard_Spellcaster (Level 9, Bard/College of Lore, 2024 ruleset)
- **Target:** NPC 1 (placeholder for Aarakocra Aeromancer in encounter)
- **Campaign:** test-campaign

## Steps to Reproduce
1. Navigate to test-campaign and select Bard_Spellcaster character
2. Ensure Faerie Fire is in the character's spell list (add if missing: `"spells": ["Faerie Fire", ...]`)
3. Ensure an NPC is in the initiative list (e.g., "NPC 1")
4. Click on "Faerie Fire" in the spells table
5. Click "Cast Spell" button in the spell detail modal
6. Target selection modal appears showing: Disciplined_Monk, Divine_Cleric, NPC 1, Wild_Sage_Druid
7. Click on "NPC 1" checkbox to select it as target
8. **BUG:** Modal closes without selecting the target, "Cast Faerie Fire (N)" button never becomes enabled
9. No faerie-fire effect is applied to the target

## Expected Behavior
- Clicking on a target checkbox should select it and update the "Cast Faerie Fire (N)" button to show the count of selected targets
- The "Cast Faerie Fire (N)" button should become enabled when at least one target is selected
- Clicking "Cast Faerie Fire (N)" should cast the spell, apply the faerie-fire targetEffect to the selected target(s), and close the modal
- The target should receive the faerie-fire effect (glowing, disadvantage on attack rolls against it, advantage for attackers who can see it)

## Actual Behavior
- Clicking on a target checkbox causes the modal to close immediately
- The "Cast Faerie Fire (N)" button never becomes enabled
- No spell is cast, no effect is applied to the target
- No faerie-fire effect appears in the campaign data

## Evidence
- Console messages show no errors during the spell casting flow
- SSE saveResult events show `saveResult-Aarakocra Aeromancer 1` MISS in pendingSaveRegistry, indicating no pending save prompt was registered
- Campaign data search for "faerie" returns no results, confirming no effect was applied
- The target selection modal closes without any visible error or confirmation

## Root Cause Analysis (Preliminary)
The issue appears to be in the target selection modal's checkbox click handler. When clicking on a target checkbox:
1. The click may be triggering a modal close instead of toggling the selection
2. The "Cast Faerie Fire (N)" button's disabled state is not being updated based on selection count
3. The `setRuntimeObject` call to apply the faerie-fire effect is never reached

Potential areas to investigate:
- `spellHandler.js` - target selection logic for area spells
- `spellRouter.js` - spell casting event routing
- The target selection modal component (likely in a spell casting modal component)
- The checkbox click handler may be missing `e.stopPropagation()` or may be triggering a close event

## Impact
- Faerie Fire spell cannot be cast at all through the UI
- The glowing/advantage effect (core Faerie Fire mechanic) is completely non-functional
- This affects all area-effect spells that require target selection

## Notes
- Faerie Fire was added to the character's spell list manually via JSON edit (`Bard_Spellcaster.json`)
- The NPC "NPC 1" was already in the initiative list from a previous encounter setup
- The spell detail modal displays correctly with all spell information
- The target selection modal appears correctly with all available targets listed
