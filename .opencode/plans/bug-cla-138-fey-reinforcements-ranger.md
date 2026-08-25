# Bug: CLA-138 Fey Reinforcements — Special Actions button not wired up

## Summary
The Fey Reinforcements class feature (Ranger Fey Wanderer, level 11) has a working backend handler and modal component, but the UI button in Special Actions is not clickable because `fey_reinforcements` is missing from `INTERACTIVE_HANDLER_TYPES`, and the modal is not rendered in `CharSpecialActions`.

## What Works
- **Free cast tracking**: `_Fey_Reinforcements_freeCastCount` correctly decrements from 1 to 0
- **Spell casting via spell sheet**: Summon Fey can be cast through the spell sheet as a free cast
- **No spell slot consumed**: Confirmed in log — `type: "spell"` with `spellLevel: 4`
- **Material component bypass**: Summon Fey's material is not in `MATERIAL_REGISTRY` (not consumed), so the gate passes
- **Summon creation**: Log shows `type: "summons"` with `summonName: "Fey Spirit"`
- **Long rest recharge**: `recharge: "long_rest"` in automation definition
- **Handler exists**: `handleFeyReinforcements` in `feyReinforcementsHandler.js`
- **Modal exists**: `FeyReinforcementsModal.jsx` with no-concentration toggle

## What's Broken
Three wiring gaps prevent the Special Actions button from working:

### 1. `fey_reinforcements` missing from `INTERACTIVE_HANDLER_TYPES`
**File:** `src/services/combat/automation/automationService.js:14-54`

`fey_reinforcements` is not in the `INTERACTIVE_HANDLER_TYPES` set, so `isInteractiveAutomation()` returns `false` and the Special Actions button renders as non-clickable text.

**Fix:** Add `'fey_reinforcements'` to the `INTERACTIVE_HANDLER_TYPES` set.

### 2. Modal state not declared in `CharSpecialActions.jsx`
**File:** `src/components/char-sheet/CharSpecialActions.jsx`

No `feyReinforcementsModal` state variable or `handleFeyReinforcementsConfirm` handler exists. The `handleAutomationClick` callback doesn't handle `modalName === 'feyReinforcements'`.

**Fix:** Add:
- State: `const [feyReinforcementsModal, setFeyReinforcementsModal] = useState(null);`
- Handler in `handleAutomationClick`: `if (result.modalName === 'feyReinforcements') { setFeyReinforcementsModal(result.payload); }`
- Pass props to `<CharSpecialActionsModals>`

### 3. Modal not rendered in `CharSpecialActionsModals.jsx`
**File:** `src/components/char-sheet/CharSpecialActionsModals.jsx`

`FeyReinforcementsModal` is not imported and not rendered. The modal component already exists at `src/components/char-sheet/modals/FeyReinforcementsModal.jsx` with the correct interface: `{ action, playerStats, campaignName, onClose }`.

**Fix:**
- Import: `import FeyReinforcementsModal from './modals/FeyReinforcementsModal.jsx';`
- Render: Add `{feyReinforcementsModal && (<FeyReinforcementsModal {...feyReinforcementsModal} onClose={() => setFeyReinforcementsModal(null)} />)}`

## Expected Behavior (from manifest)
> "Cast Summon Fey without Material component. Cast it once without spell slot, regain on Long Rest. Can modify it to not require Concentration (duration becomes 1 minute)."

## Verification Results
| Requirement | Status | Evidence |
|---|---|---|
| Cast Summon Fey | PASS | Log shows spell entry + summons entry |
| Without Material component | PASS | Material not in consumed registry; cast succeeded |
| Once without spell slot | PASS | `_Fey_Reinforcements_freeCastCount: 0` after cast |
| Regain on Long Rest | PASS | `recharge: "long_rest"` in automation |
| Skip Concentration option | FAIL | Modal not wired up in UI |
| Special Actions button clickable | FAIL | Not in `INTERACTIVE_HANDLER_TYPES` |

## Root Cause
The automation handler and modal component were implemented but never wired into the UI integration layer. The feature was added to `HANDLER_MAP` and `isFreeCastAuthorized`, but the interactive UI plumbing was omitted.
