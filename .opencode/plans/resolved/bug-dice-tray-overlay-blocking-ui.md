# Bug: Dice Tray Overlay Blocks Interaction with Other UI Elements

## Summary
The dice roller tray popup overlay remains open and intercepts pointer events, preventing clicks on UI elements behind it (e.g., "Generate NPC" button on the NPCs page).

## Steps to reproduce
1. Navigate to test-campaign, then to the NPCs page.
2. Click on any dice button in the bottom-left dice tray (e.g., d20).
3. The dice tray popup overlay appears.
4. Without closing the dice tray, try to click the "Generate NPC" button.
5. The click fails — the overlay intercepts all pointer events.

## Expected behavior
The dice tray should have a close button that is easily accessible.

## Actual behavior
The dice tray overlay (`<div class="dice-tray-popup-overlay">`) stays open and blocks all pointer events to elements behind it. Clicking on "Generate NPC" (or any other button behind the overlay) times out with the error: `<div class="dice-tray-popup-overlay">…</div> intercepts pointer events`.

The only way to dismiss it is to press Escape or click the dice tray area itself.

## Likely location
Frontend dice roller component — likely in a component that renders the dice tray popup. The overlay is a `<div class="dice-tray-popup-overlay">` and the modal is a `<div class="short-rest-modal">` pattern. Search for `dice-tray-popup-overlay` in the codebase.

The issue is likely that the overlay's `pointer-events: all` CSS is applied globally without a mechanism to close it after interaction completes, or the close-on-click-outside logic is missing.

## Suggested fix
1. Add a close button to the dice tray popup.
2. Add click-outside-to-close behavior for the overlay.
3. Or ensure the overlay automatically closes after the dice roll animation completes.
4. Consider using `pointer-events: none` on the overlay when it's not needed, or position it so it doesn't overlap critical UI elements.

## Severity
**Minor UX issue** — The dice tray is eventually dismissible (Escape key works), but it creates a frustrating experience when trying to quickly perform actions after rolling dice.

## Resolution

**Root cause:** The dice popup (`DicePopup` component) had no obvious close mechanism. While the overlay background had `onClick={onClose}` and Escape key worked, there was no visible close button. The dismiss text "click anywhere to dismiss" was small and easily missed, causing confusion when users needed to close the popup to interact with underlying UI elements.

**Fix:** Added a visible close button (X icon) to the top-right corner of the dice popup modal. The button:
- Calls the same `onClose` handler as the overlay background click
- Is positioned absolutely within the modal (which is now `position: relative`)
- Uses flexbox on the overlay for centering instead of absolute positioning with transform
- Matches the app's existing styling conventions

**Files changed:**
- `src/components/sidebar/DiceTray.jsx` — Added `<button className="dice-tray-popup-close">` with Font Awesome X icon inside the modal
- `src/components/sidebar/DiceTray.css` — Added `.dice-tray-popup-close` styles and changed `.dice-tray-popup-overlay` to use flexbox centering, changed `.dice-tray-popup-modal` to `position: relative`

**Verification:**
1. Reproduced the bug: opened dice popup on NPCs page, confirmed overlay blocks "Generate NPC" button clicks
2. Verified close button appears in top-right of popup
3. Clicked close button — popup dismissed successfully
4. After closing, clicked "Generate NPC" button — worked correctly
5. All 30,021 existing tests pass (including all 24 DiceTray tests)
6. ESLint passes with zero warnings
