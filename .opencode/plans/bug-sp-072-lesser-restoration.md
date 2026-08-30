# Bug SP-072 — Lesser Restoration

## Title
Lesser Restoration (bonus-action touch spell) never surfaces its target/condition picker — cast silently stalls, no condition ended, no slot consumed.

## Overview
Lesser Restoration is a 2nd-level **Bonus Action**, Touch-range spell whose `automation.type` is `lesser_restoration`. Because its casting time is a bonus action, the sheet surfaces it ONLY as a **Bonus Actions** spell row (`CharBonusActions.jsx`), not as a normal Spells-table row. `CharBonusActions.jsx` builds the cast through `useSpellMetamagicFlow` → `gateMetamagic`, which correctly sets the `lesserRestoration` pending op (confirmed live: `pendingOps = { lesserRestoration: { creatureTargets: [20 targets], range: "Touch" } }`). However, `CharBonusActions.jsx` destructures and renders pickers for only `pendingMetamagic`, `pendingBarkskin`, `pendingHealingWord`, and `pendingSanctuary`. It does **NOT** render the `pendingLesserRestoration` SecondaryTargetModal (target) or its condition-picker stage — those render blocks exist only in `char-spells/TargetSpellPopups.jsx` (lines 468–511), which is mounted by `CharSpells` for main-table spells, not by `CharBonusActions`. Result: the pending op is set but nothing renders, so the player can never pick a target/condition and the cast stalls forever.

## Expected
Casting Lesser Restoration on an afflicted creature opens a target picker then a condition picker; on confirm the chosen condition is removed from `"<target>".activeConditions` and a 2nd-level spell slot is consumed, plus `ability_use` + `spell_effect` log entries (`lesserRestorationHandler.applyLesserRestoration`).

## Actual
Clicking the Bonus-Actions "Lesser Restoration" row opens the standard SpellDetailPopup ("Cast Spell" enabled, "Slots Remaining: 3 slots"). Clicking **Cast Spell** closes the popup but produces **no target picker / no condition picker / no confirmation**. The cast silently stalls:
- `activeConditions` unchanged: `["poisoned"]` before AND after.
- `spell_slots_level_2` unchanged: **3 → 3** (no slot spent).
- No "restoration" entry in the campaign log.
- Fiber inspection confirms the gate DID fire and set `pendingOps.lesserRestoration` with 20 creature targets — the pending is set but never rendered.

## Steps to Reproduce
1. test-campaign, Divine_Cleric (2024 Cleric lv17; Lesser Restoration prepared in `spells[]`, ground-truth JSON).
2. Initiative view → Divine_Cleric card → **Add** (`.ea-overlay`) → Conditions → Poisoned → **Apply**. Verify `"<Divine_Cleric>".activeConditions == ["poisoned"]`.
3. Character sheet → Bonus Actions section → click the "Lesser Restoration" row (`div.left.clickable`, CharBonusActions.jsx:245) → SpellDetailPopup → **Cast Spell**.
4. Observe: popup closes, NO SecondaryTargetModal appears. Re-read change-data: `activeConditions` still `["poisoned"]`, `spell_slots_level_2` still 3, log has no restoration entry.

## Likely Location
- `src/components/char-sheet/CharBonusActions.jsx:132` — destructure omits `pendingLesserRestoration` / `pendingLesserRestorationTarget` / `handleLesserRestorationConfirm` / `handleLesserRestorationSkip`.
- `src/components/char-sheet/CharBonusActions.jsx:385–410` — render block renders SecondaryTargetModal only for barkskin/healingWord/sanctuary; missing the Lesser Restoration target modal + condition picker (the working two-stage render lives unused at `src/components/char-sheet/char-spells/TargetSpellPopups.jsx:468–511`).
- Gate/dispatch are correct: `automationRouter.js:454` (lesser_restoration→bonusActions), `automation/index.js:553`, `spellGates.js:192 gateLesserRestoration`, handler `src/services/automation/handlers/spells/lesserRestorationHandler.js`. The defect is purely the missing modal render for bonus-action-gated spells in `CharBonusActions`.

## Notes
- Control: casting **Heal** (a non-bonus-action touch spell in the main Spells table) via `CharSpells` → `TargetSpellPopups` opens its SecondaryTargetModal radio picker normally — proving the pipeline and render work for spells whose picker is mounted in the right component. Lesser Restoration is bonus-action-only, so it lands exclusively in `CharBonusActions`, which omits the picker → stalls. This is NOT a "cannot test / setup gap" case: the spell is genuinely castable-by-data, prepared, has slots (lv2=3), target present (self in combatSummary), pending correctly staged.
- Any Lesser Restoration caster (Cleric/Paladin/Ranger/Druid/Bard, 2024) hits the same path identically since casting_time is fixed "Bonus Action".
- Slot rollback on Skip is moot here (no slot was ever consumed). Fixing means destructuring + rendering the LR target + condition pickers in `CharBonusActions.jsx` (or routing bonus-action lesser_restoration through the `TargetSpellPopups` mount).

## Evidence
- Before: `activeConditions=["poisoned"]`, `spell_slots_level_2=3`.
- After cast attempt: `activeConditions=["poisoned"]`, `spell_slots_level_2=3`, log `[]`.
- Live fiber pending: `{ lesserRestoration: { creatureTargets: 20 } }` set, no modal rendered.
