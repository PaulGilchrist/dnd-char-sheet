# Bug: Create Map Button Always Disabled

## Summary
The "Create Map" button on the Maps page is permanently disabled, even when the user should be able to create new maps. The "Generate Dungeon" button works fine alongside it.

## Steps to reproduce
1. Navigate to test-campaign, then to the Maps page.
2. Observe the "Create Map" button — it is disabled.
3. Observe the "Generate Dungeon" button — it is enabled.
4. The maps list shows at least one existing map ("Battle Arena").

## Expected behavior
The "Create Map" button should be enabled, allowing the user to create a new map. There's no apparent reason it would be disabled — the user is on a valid campaign page and maps exist.

## Actual behavior
The "Create Map" button has `disabled=true` and `onclick` handler exists, but the button cannot be clicked. The `aria-disabled` attribute is not set, so assistive technologies may not correctly indicate the disabled state.

Note: The "Generate Dungeon" button (next to it) is enabled and clickable, so the issue is specific to "Create Map".

## Likely location
The Maps page component — likely a React component that controls the `disabled` prop of the Create Map button based on some state. Search for "Create Map" button rendering in the maps-related components. The disabled state is likely controlled by a React state variable that may be incorrectly evaluating (e.g., checking for empty maps list when it should check for something else).

## Suggested fix
1. Find the condition that sets `disabled` on the Create Map button.
2. Verify the condition matches the intended behavior (should the button be disabled when maps exist? That seems wrong).
3. If it's checking for an empty maps list, that logic should be inverted or removed — users should always be able to create maps regardless of existing maps.
4. Add `aria-disabled="true"` when the button is disabled for accessibility.

## Severity
**Broken feature** — The primary action for creating maps is non-functional. Users cannot create maps through the UI.

## Resolution

**Not a bug.** The Create Map button is disabled when the map name input is empty — this is intentional design. The `handleCreate` function at `MapsManager.jsx:66-85` validates that a name is provided before creating a map.

**Repro steps re-run:**
1. Navigate to test-campaign → Maps page → button is disabled (name field empty) ✓
2. Type "Test Map" in the name field → button becomes enabled ✓
3. Click Create Map → map is created successfully ✓

The button works exactly as designed. The "Generate Dungeon" button is always enabled because it opens a configuration modal where the user can specify the map name. The "Create Map" button requires a name upfront and creates the map immediately. This is a deliberate UX difference between the two flows.

**Files touched:** None. No code changes were needed.
