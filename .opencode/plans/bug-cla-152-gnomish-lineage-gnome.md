# Bug Report: CLA-152 Gnomish Lineage - Gnome

## Summary
The Gnomish Lineage automation (CLA-152) is non-functional. Clicking "Gnomish Lineage" on a Gnome character's sheet produces no response. The handler exists and is registered, but the entire UI layer is missing.

## Manifest Issues
The manifest at `docs/automations-manifest.json:2770-2778` references non-existent files:
- `handler`: `src/services/combat/automation/handlers/classFeatureHandler.js` — **does not exist**
- `router`: `src/services/combat/automation/routers/classFeatureRouter.js` — **does not exist**
- `infoBuilder`: `src/services/combat/automation/infoBuilders/classFeatureInfoBuilder.js` — **does not exist**

Actual handler is registered at `src/services/automation/index.js:498`: `gnomish_lineage: handleGnomishLineage` (imported from `src/services/automation/handlers/class-other/gnomishLineageHandler.js:185`).

## Bug 1: Missing UI — Modal, State, Handlers, and Click Routing

The handler (`gnomishLineageHandler.js:29-37`) returns `{ type: 'modal', modalName: 'gnomishLineage', payload: ... }` when no lineage is selected. However, **zero UI wiring exists** to handle this modal:

### CharSpecialActions.jsx
- **No state**: No `gnomishLineageModal` useState (line 29-60 has only `elfishLineageModal`)
- **No confirm handler**: No `handleGnomishLineageConfirm` callback (line 255-263 has only `handleElfisLineageConfirm`)
- **No skip handler**: No `handleGnomishLineageSkip`
- **No click routing**: `handleAutomationClick` (lines 398-455) has `result.modalName === 'elfishLineage'` at line 453 but **no case for `'gnomishLineage'`**
- **No modals props**: `CharSpecialActionsModals` call (lines 655-717) has no `gnomishLineageModal` props
- **No import**: No `confirmGnomishLineage` import (line 25 only imports `confirmElfisLineage`)

### CharSpecialActionsModals.jsx
- **No import**: No `GnomishLineageModal` import (line 27 only imports `ElfisLineageModal`)
- **No props**: No `gnomishLineageModal` in function signature (lines 39-100)
- **No rendering**: No `{gnomishLineageModal && <GnomishLineageModal ...>}` block (lines 102-426)

### GnomishLineageModal.jsx
- **File does not exist** — no `src/components/char-sheet/GnomishLineageModal.jsx`

### useCharActionsAutomation.js
- **Modal mapping exists** at line 91: `gnomishLineage: simpleModal('gnomishLineageModal')` — but this is unused because `CharSpecialActions.jsx` handles modals directly via `handleAutomationClick`

## Bug 2: Handler Does Not Update `playerStats.race.lineage`

Even if the UI worked, the handler would not apply lineage-specific effects:

### Race rules require `playerStats.race.lineage` for:
- **Deep Gnome Darkvision override** (`race-rules/2024.js:202`): checks `playerStats.race?.lineage` to extend Darkvision to 120 ft.
- **Lineage traits** (`race-rules/2024.js:223`): checks `playerStats.race?.lineage` to add lineage-specific traits
- **Race resolution** (`race-rules/2024.js:60`): checks `playerSummary.race.lineage` to apply lineage traits to race data

### Handler only sets runtime state:
`confirmGnomishLineage` (`gnomishLineageHandler.js:59-63`) sets:
- `_gnomishLineageSelection` → runtime state
- `_gnomishLineageAbility` → runtime state
- `_gnomishLineageCantrip` → runtime state
- `_gnomishLineageLevel3` → runtime state
- `_gnomishLineageLevel5` → runtime state

**None of these update `playerStats.race.lineage`**, so Deep Gnome darkvision and lineage traits will never be applied.

### Same bug exists in Elfish Lineage:
`confirmElfisLineage` (`elfishLineageHandler.js:62-66`) has the identical pattern — only sets runtime state, never updates `playerStats.race.lineage`.

## Impact
- A player clicking "Gnomish Lineage" on a Gnome character sheet will see **nothing happen**
- Even if the UI worked, Deep Gnome's 120 ft. darkvision and lineage traits would **not be applied**
- Lineage spells (cantrip, level 3, level 5) are added via `spellCalc2024.js:216-256` which reads from `playerStats.race.subrace.name` — this works for subrace matching, but the spellcasting ability from lineage runtime state is not consumed by the spell calculator

## Files That Need Changes
1. **`src/components/char-sheet/GnomishLineageModal.jsx`** — Create new (copy from `ElfisLineageModal.jsx` pattern)
2. **`src/components/char-sheet/CharSpecialActions.jsx`** — Add state, confirm/skip handlers, click routing, modals props
3. **`src/components/char-sheet/CharSpecialActionsModals.jsx`** — Add import, props, rendering
4. **`src/services/automation/handlers/class-other/gnomishLineageHandler.js`** — Update `confirmGnomishLineage` to also set `playerStats.race.lineage`
5. **`src/services/automation/handlers/class-other/elfishLineageHandler.js`** — Same fix for consistency
6. **`docs/automations-manifest.json`** — Update handler/router/infoBuilder paths to actual locations

## Expected Behavior (from manifest)
> "You are part of a lineage that grants you supernatural abilities. Choose one option; Intelligence, Wisdom, or Charisma is your spellcasting ability for the chosen lineage spells. (Gnome trait)"

## Current Behavior
Nothing. The feature exists in the character data but clicking it does nothing.
