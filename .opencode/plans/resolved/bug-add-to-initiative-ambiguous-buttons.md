# Bug: Ambiguous "Add to Initiative" Buttons with Duplicate Roles

## Summary
When multiple NPCs exist, each has an "Add to Initiative" button with identical accessible names. Automated tools (and potentially users) cannot reliably distinguish which NPC's button they're clicking.

## Steps to reproduce
1. Navigate to test-campaign, then to the NPCs page.
2. Create two NPCs (e.g., "Test Goblin" and "Test Skeleton").
3. Both NPCs appear in the list, each with an "Add to Initiative" button.
4. Attempt to target a specific NPC's "Add to Initiative" button using only the accessible name "Add to Initiative".
5. Playwright (and screen readers) cannot distinguish between the two buttons — both have `title="Add to Initiative"` and identical role/label.

## Expected behavior
Each "Add to Initiative" button should have a unique accessible name that identifies the NPC, e.g., "Add Test Goblin to Initiative" or include the NPC name in the title attribute. Alternatively, the button could be nested within a list item or card for the NPC, providing implicit context.

## Actual behavior
Both buttons have the same accessible name "Add to Initiative". This causes ambiguity in:
- Automated testing (strict mode violations)
- Screen reader users (no way to know which NPC will be added)
- Keyboard navigation (no visual distinction beyond proximity)

## Likely location
The NPC list item component that renders each NPC's "Add to Initiative" button. Search for the `npcs-init-btn` class or "Add to Initiative" button rendering in the NPC list component. The button's `title` and text content should include the NPC name.

## Suggested fix
Change the button text/title to include the NPC name:
```jsx
<button title={`Add ${npc.name} to Initiative`}>
  Add to Initiative
</button>
```
Or use the NPC name as the accessible name while keeping the visible text as "Add to Initiative" via `aria-label`.

## Severity
**Minor UX issue** — The buttons work correctly when clicked visually (proximity makes it clear which NPC), but accessibility and automation are impacted.

## Resolution

### Root Cause
The "Add to Initiative" button in `NPCListItem.jsx` used a static `title` attribute and visible text of `"Add to Initiative"` without including the NPC's name. When multiple NPCs with stat blocks exist in the list, all their initiative buttons share the same accessible name, making them indistinguishable to screen readers and automated testing tools.

### Files Changed
1. **`src/components/npcs/NPCListItem.jsx`** (line 64-66) — Changed the button's `title` from `"Add to Initiative"` to `` `Add ${npc.name} to Initiative` `` and updated the visible text to `` Add {npc.name} to Initiative ``.
2. **`src/components/npcs/NPCListItem.test.jsx`** (lines 91, 97, 103, 108) — Updated test assertions to use the NPC name in title lookups: `getByTitle('Add Gandalf to Initiative')` and `queryByTitle(/Add.*to Initiative/)` for absence checks.

### Verification
- **Repro steps re-run in browser:** Created two NPCs ("Test Goblin", "Test Skeleton") in test-campaign. Both buttons now display unique accessible names: "Add Test Goblin to Initiative" and "Add Test Skeleton to Initiative". Playwright can target each button uniquely by name.
- **Tests:** All 20 NPCListItem tests pass. All 151 NPC component tests pass.
- **Lint:** Zero warnings.
