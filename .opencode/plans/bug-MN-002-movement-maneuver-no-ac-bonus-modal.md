# Bug: Bait and Switch (MN-002) — Movement Maneuver Returns Generic Popup Instead of AC Bonus Choice Modal

## Overview

When a Fighter (Battle Master, 2024 rules) uses the **Bait and Switch** maneuver as a movement maneuver, the automation returns a generic popup stating "You or the ally gains +${dieValue} AC" but **never shows the `baitAndSwitchChoice` modal** to let the player choose who gets the AC bonus, and **never sets the `baitAndSwitchActive`/`baitAndSwitchBonus` runtime values** on any target.

The correct behavior exists in `executeManeuver()` but is unreachable because the dispatcher routes movement maneuvers through `executeMovementManeuver()` which lacks the `ac_bonus_and_swap` effect handler.

## Expected Behavior

Per the maneuver description:

> Roll the Superiority Die. Until the start of your next turn, you or the other creature (your choice) gains a bonus to AC equal to the number rolled.

The automation should:
1. Roll the superiority die
2. Spend the superiority die
3. **Show the `baitAndSwitchChoice` modal** with options for the player to choose who gains the AC bonus (self or an ally)
4. Upon selection, set `baitAndSwitchActive=true`, `baitAndSwitchBonus=<dieValue>`, and `baitAndSwitchSource` on the chosen target
5. Add a `bait_and_switch_clear` expiration
6. Log the ability use

## Actual Behavior

The automation:
1. Rolls the superiority die
2. Spends the superiority die
3. **Returns a generic `popup`** with description "Bait and Switch<br/>Rolled d6 for X. You or the ally gains +X AC until the start of your next turn."
4. **Does NOT show the `baitAndSwitchChoice` modal**
5. **Does NOT set any `baitAndSwitchActive`/`baitAndSwitchBonus` runtime values**
6. Does log the ability use (this part works)

The AC bonus is never actually applied to any creature.

## Steps to Reproduce

1. Open the app and select "test-campaign"
2. Create or select a **2024 ruleset** Fighter (Battle Master subclass) with Bait and Switch maneuver selected in `BattleMasterManeuvers_selection`
3. Add an ally creature to the encounter (e.g., via Encounter Builder → Add to Initiative)
4. In combat, trigger a movement action that uses the Bait and Switch maneuver
5. Observe: the result is a generic popup, NOT the `baitAndSwitchChoice` modal
6. Observe: no `baitAndSwitchActive` or `baitAndSwitchBonus` values are set on any creature
7. The character's AC does not increase

## Likely Location

**Primary bug — `executeMovementManeuver` lacks `ac_bonus_and_swap` handler:**
- `src/services/automation/handlers/class-fighter-rogue/executeActionManeuvers.js` lines 206-241
- The function rolls the die and spends it, then returns a generic popup
- It does NOT check `maneuver.effect === 'ac_bonus_and_swap'` to show the modal

**Correct behavior exists but is unreachable — `executeManeuver` handles it:**
- `src/services/automation/handlers/class-fighter-rogue/executeManeuver.js` lines 144-173
- This function correctly checks `maneuver.effect === 'ac_bonus_and_swap'` and returns `baitAndSwitchChoice` modal

**Dispatcher routes movement to the wrong function:**
- `src/services/automation/handlers/class-fighter-rogue/dispatchers.js` lines 44-45 (`handleCombatSuperiorityMovement` → `executeMovementManeuver`)
- `src/services/automation/handlers/class-fighter-rogue/dispatchers.js` lines 191-192 (`onCombatSuperioritySelected` → `executeMovementManeuver`)

**Maneuver data (correct):**
- `public/data/2024/maneuvers.json` line 11-17 — Bait and Switch has `actionType: "movement"` and `effect: "ac_bonus_and_swap"`

**Choice handler exists and works (tested):**
- `src/services/automation/handlers/class-fighter-rogue/combatSuperiorityUtils.js` lines 198-238 — `executeBaitAndSwitchChoice()` correctly sets all runtime values

**No tests for `executeMovementManeuver`:**
- No test file exists for `executeMovementManeuver` — the function is completely untested

## Notes

- **Related correct code**: `executeManeuver.js:144-173` shows the exact pattern needed — check `maneuver.effect === 'ac_bonus_and_swap'` and return a `baitAndSwitchChoice` modal
- **Related correct code**: `executeManeuver.js:175-183` shows how `ac_bonus_disengage` (Evasive Footwork) sets runtime values directly (no modal needed since it always applies to self)
- **Choice handler**: `executeBaitAndSwitchChoice()` in `combatSuperiorityUtils.js:198-238` is tested and works correctly — it sets `baitAndSwitchActive`, `baitAndSwitchBonus`, `baitAndSwitchSource`, and adds expiration
- **The fix**: Add a `maneuver.effect === 'ac_bonus_and_swap'` check in `executeMovementManeuver()` (executeActionManeuvers.js) that returns a `baitAndSwitchChoice` modal, mirroring the logic in `executeManeuver.js:144-173`
- **Character created**: `BattleMasterTest.json` in test-campaign — Fighter level 5, Battle Master subclass, 2024 rules, with appropriate ability scores (STR 16, CON 14)
