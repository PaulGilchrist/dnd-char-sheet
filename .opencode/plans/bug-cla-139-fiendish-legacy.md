# Bug: CLA-139 Fiendish Legacy - Modal Not Wired Up

## Summary

The Fiendish Legacy automation (Tiefling racial trait) has a working handler and modal component, but the modal is never displayed because it is not wired up in the CharSpecialActions component chain.

## Root Cause

When a Tiefling character clicks on the Fiendish Legacy special action:

1. `handleAutomationClick` in `CharSpecialActions.jsx` calls `executeHandler(action, ...)`
2. The handler maps `fiendish_legacy` to `handleFiendishLegacy` (`src/services/automation/handlers/class-other/fiendishLegacyHandler.js:500`)
3. The handler returns `{ type: 'modal', modalName: 'fiendishLegacy', payload: { action, playerStats, campaignName } }`
4. **The modal name `fiendishLegacy` is never matched** in the `if` chain at `CharSpecialActions.jsx:398-455`
5. The modal payload is silently dropped - no state is set, no modal is rendered

## Evidence

### Handler exists and works correctly
- `src/services/automation/handlers/class-other/fiendishLegacyHandler.js` - returns `modalName: 'fiendishLegacy'` (line 31)
- Tests pass: `src/services/automation/handlers/class-other/fiendishLegacyHandler.test.js` (223 lines)

### Modal component exists and works correctly
- `src/components/char-sheet/modals/FiendishLegacyModal.jsx` - fully implemented (87 lines)
- Tests pass: `src/components/char-sheet/modals/FiendishLegacyModal.test.jsx` (310 lines)

### Wiring is missing - THREE gaps:

**Gap 1: CharSpecialActions.jsx has no state for the modal**
- Line 49: `fiendishResilienceModal` exists but no `fiendishLegacyModal`
- Missing: `const [fiendishLegacyModal, setFiendishLegacyModal] = useState(null);`

**Gap 2: CharSpecialActions.jsx doesn't handle the modal name**
- Lines 398-455: `if (result.modalName === '...')` chain handles 20+ modal names
- `fiendishLegacy` is NOT in the chain
- Missing: `else if (result.modalName === 'fiendishLegacy') { setFiendishLegacyModal(result.payload); }`

**Gap 3: CharSpecialActionsModals.jsx doesn't import or render the modal**
- Line 1-27: Imports 27 modal components
- FiendishLegacyModal is NOT imported
- Missing: `import FiendishLegacyModal from './modals/FiendishLegacyModal.jsx';`
- No rendering of `<FiendishLegacyModal>` in the return JSX

## Expected Behavior (from manifest)

> "You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table. You gain the level 1 benefit of the chosen legacy."

## Actual Behavior

The Fiendish Legacy special action is collected and routed to specialActions, but clicking it does nothing visible - the modal is silently dropped.

## Fix Required

Three changes needed:

1. **CharSpecialActions.jsx**: Add `fiendishLegacyModal` state variable
2. **CharSpecialActions.jsx**: Add `else if (result.modalName === 'fiendishLegacy')` handler in the modal dispatch chain
3. **CharSpecialActionsModals.jsx**: Import and render `<FiendishLegacyModal>` with proper props

## Notes

- HexWarlock is Human, not Tiefling - cannot test with existing characters
- Requires a Tiefling character to trigger
- The handler stores selection in runtime: `_fiendishLegacySelection`, `_fiendishLegacyAbility`, `_fiendishLegacyCantrip`, `_fiendishLegacyLevel3`, `_fiendishLegacyLevel5`
- After selection, clicking again shows a popup with the already-selected legacy (line 17-26 of handler)
