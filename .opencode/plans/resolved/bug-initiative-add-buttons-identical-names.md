# Bug: 101 Identical "Add" Buttons on Initiative Page

## Summary
The Initiative page renders approximately 101 buttons with the identical accessible name "Add" and identical title "Add condition, effect, or concentration". These buttons have no unique identifiers, making them impossible to distinguish for screen readers or automated testing.

## Steps to reproduce
1. Navigate to test-campaign.
2. Click the "Initiative" button in the sidebar.
3. Count the number of buttons with text "Add" — there are approximately 101.
4. Each button has `title="Add condition, effect, or concentration"` and `className="effect-add-btn"`.
5. Attempt to target a specific creature's "Add" button using only the accessible name "Add" — it resolves to all 101 buttons.

## Expected behavior
Each "Add" button should be associated with its creature/character in the initiative order. Options:
- Include the creature name in the accessible name (e.g., "Add condition to Reckless Attack Barbarian")
- Wrap each button in a labeled container (fieldset/legend or aria-labelledby)
- Use the creature name as part of the button's accessible name via aria-label

## Actual behavior
All 101 buttons have the same accessible name "Add". Screen reader users cannot determine which creature they're adding an effect to. Automated testing tools (Playwright strict mode) fail to distinguish between them.

The buttons appear to be per-creature effect adders, but there's no structural or accessible association between the button and its creature.

## Likely location
The initiative tracker component — likely a component that renders each creature's entry with effect badges and an "Add" button. Search for `effect-add-btn` class in the codebase. The button rendering likely needs to include the creature name in its accessible name.

## Suggested fix
When rendering each `effect-add-btn`, include the creature name in the accessible name:
```jsx
<button 
  className="effect-add-btn" 
  title={`Add condition, effect, or concentration to ${creature.name}`}
  aria-label={`Add condition, effect, or concentration to ${creature.name}`}
>
  Add
</button>
```

## Severity
**Minor UX issue / Accessibility** — The buttons work correctly when clicked visually (proximity makes it clear which creature), but screen reader users and automated tests cannot distinguish between them.

## Resolution

**Root cause confirmed** — the bug file's "Likely location" and "Suggested fix" were correct. The `effect-add-btn` button in `CreatureCard.jsx` had a static `title` attribute and no `aria-label`, making all 101 buttons indistinguishable by accessible name.

**Files changed:**
- `src/components/initiative/CreatureCard.jsx:226-235` — Updated the effect add button to include the creature name in both `title` and `aria-label` attributes
- `src/components/initiative/CreatureCard.conditions.test.jsx:163-174` — Updated test assertions to match the new dynamic title format

**Verification:**
1. Navigated to test-campaign in browser, clicked Initiative — confirmed 101 buttons existed
2. Applied fix to `CreatureCard.jsx`
3. Re-ran repro steps in browser — each button now has a unique accessible name (e.g., "Add condition, effect, or concentration to Test Skeleton", "Add condition, effect, or concentration to NPC 1", etc.)
4. Ran `npm run lint` — zero warnings
5. Ran `npm run test:run` — all 1730 test files pass (30021 tests)
