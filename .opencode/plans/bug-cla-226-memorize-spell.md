# Bug CLA-226 — Memorize Spell (2024 Wizard): Short Rest swap UI never renders

## Title
CLA-226 Memorize Spell — gate reads `automation.passives` but router emits `automation.specialActions`; swap UI unreachable

## Overview
Memorize Spell (2024 Wizard lv5 class feature) should let the wizard swap one prepared level 1+ spell for another spellbook spell whenever a Short Rest is finished. The swap UI exists in the Short Rest modal but its `hasMemorizeSpell` gate checks the wrong automation bucket, so the section NEVER renders for any real Wizard. The feature has no other reachable activation.

## Expected
Whenever a 2024 Wizard finishes a Short Rest, the Short Rest modal offers a "Memorize Spell" section ("Swap Prepared Spell" button → Remove/Add selects → "Swap Spell") that replaces exactly one prepared lv1+ spell and persists the new list to runtime `preparedSpells`.

## Actual
Short Rest modal on DivinationWizard (2024 Wizard lv20, Divination) shows only sections: **Hit Dice, Resources Restored, Arcane Recovery**. No "Memorize Spell" section, zero "Swap Prepared Spell" buttons (confirmed twice, deterministic). No prepared-spell swap occurs on rest.

## Steps to Reproduce
1. Campaign test-campaign → open DivinationWizard sheet (2024 Wizard lv20, spellbook 17 spells, all auto-prepared via spellCalc2024.js:146).
2. Uncheck **Alarm** (lv1) in the Prepared column so an unprepared lv1+ spellbook spell exists (sheet flips to unprepared; runtime `preparedSpells` written).
3. Click **Short Rest** on the sheet header.
4. Observe: modal sections are only Hit Dice / Resources Restored / Arcane Recovery — no Memorize Spell section (repro step).
5. Click **Complete Short Rest** → runtime `preparedSpells` unchanged (verified via `/api/campaigns/test-campaign/change-data`: `DivinationWizard.preparedSpells` = 13 spells, Alarm absent, no auto-swap, no swap happened).

## Evidence (live)
- React fiber probe of `playerStats.automation` (CharSheetContent/CharSummary props): `passives: [resource_restoration:Arcane Recovery, passive_rule:Expert Divination, meta:Resourceful]` — NO `memorize_spell` entry; `specialActions: [..., memorize_spell:Memorize Spell, ...]`.
- Data ground truth: `public/data/2024/classes.json` classes[11] (Wizard) class_levels[4] (lv5) features[0] "Memorize Spell", automation `{type:'memorize_spell', casting_time:'passive'}`.
- Sheet Special Actions shows "Memorize Spell:" as inert `<b class="">` (memorize_spell not in INTERACTIVE_HANDLER_TYPES — CLA-179 family; by design the activation surface is the Short Rest modal, which is dead).
- Unit tests pass (51/51 in ShortRestModal.test.jsx, ShortRestModal.coverage.test.jsx, misc.test.js) — they hand-craft `automation: { passives: [{ type: 'memorize_spell' }] }`, masking the collect-time routing mismatch.

## Likely Location
- `src/components/char-sheet/ShortRestModal.jsx:87-89` — `hasMemorizeSpell = isWizard && (playerStats.automation?.passives ?? []).find(a => a.type === 'memorize_spell')`.
- `src/services/combat/automation/automationRouter.js:589-591` — `case 'memorize_spell': result.specialActions.push(info)` (routing contradicts the consumer).

Fix options: change the gate at ShortRestModal.jsx:87 to search `automation?.specialActions` (or both buckets), or change the router to push memorize_spell into `result.passives`. Note `signature_spells`/`spell_mastery` follow the same specialActions pattern — check their consumers before moving the router case.

## Notes
- The intended swap implementation itself (selects + `setRuntimeValue(preparedSpells)` replace-one logic, ShortRestModal.jsx:594-606) looks correct and is well unit-tested — it is purely unreachable at runtime.
- Secondary gaps (for post-fix retest): swap writes no dedicated log entry (only the generic `short_rest` entry); spellbook select lists ALL spells.json lv1+ spells with no Wizard/class filter (`loadSpellData` → `loadSpells(version)`, dataLoader.js:440), so non-wizard spells are offered "from your spellbook".

## Cleanup
Runtime change-data + campaign log cleared via Admin after run; Alarm prepared-state restored by Clear Change Data.
