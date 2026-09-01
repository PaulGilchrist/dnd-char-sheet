# BUG SP-089 — Power Word Kill: effect branches CORRECT, lv9 spell slot never consumed (Words-of-Creation gate bypass)

## Overview
SP-089 Power Word Kill (Wizard lv9, verified on DivinationWizard lv20 Evoker, 2024 rules) executes BOTH rule legs correctly at runtime — instant death at ≤100 HP and 12d12 Psychic above 100 HP — but the lv9 spell slot is NEVER consumed on any cast. The custom "Words of Creation — Choose Second Target" branch in `useSpellMetamagicGates.js` (shared with Power Word Heal, bug-sp-088) calls `onExecute` directly without ever calling `prepareSpellCast`. Same bypass family as bug-sp-088 / bug-sp-085.

## Expected Behavior
Cast consumes one lv9 slot per cast (`spell_slots_level_9` 1→0; lv20 wizard has exactly one lv9 slot). Target ≤100 HP dies instantly (no save); target >100 HP takes 12d12 Psychic (12–144), survives.

## Actual Behavior
- ≤100 HP leg: PASS — Wight 1 (82 HP) → currentHp 0, `hp_change delta:-82 threshold:"dead" note:"Power Word Kill"`, popup "Wight 1 was slain by Power Word Kill", no save prompt, no death-save stage.
- >100 HP leg: PASS — Archmage 1 (170 HP) → 170→99, `hp_change delta:-71`, popup "Archmage 1 took 71 Psychic damage (too healthy to kill)" — 71 is in range 12–144 (12d12), target survives, correct branch.
- Slot leg: **FAIL** — `DivinationWizard.spell_slots_level_9` was **1 before cast 1, 1 after cast 1, and still 1 after cast 2** (>30 s apart, past debounce). Two lv9 casts, zero slot expenditure, zero `ability_use` slot-spend log. Zero console errors.

## Steps (reproduced 2026-09-01)
1. test-campaign, DivinationWizard lv20 Wizard (Evoker). Edit wizard → Spells step → dismiss `.mi-skip` → tick "Power Word Kill" `.list-item-checkbox-trigger` → ✓Save → 15 s → JSON `spells[]` contains "Power Word Kill".
2. Encounter Builder → tick "Select Archmage" (HP 170) + "Select Wight" (HP 82) → `.encounter-btn-join`.
3. Initiative view → DivinationWizard card Target dropdown = Wight 1 (verify combatSummary `targetName` after ~12 s).
4. DivinationWizard sheet → Actions-grid row `div.left.clickable` "Power Word Kill" (NOT a `td.spell-name` table row) → SpellDetailPopup ("Slots Remaining: 1 slot") → Cast Spell.
5. "Words of Creation — Choose Second Target" `.sp-overlay` appears → Skip (`.sp-dismiss-btn`).
6. Popup "Wight 1 was slain by Power Word Kill"; change-data Wight currentHp 0. `spell_slots_level_9` still 1.
7. Card Target = Archmage 1, re-open sheet, cast again (possible only BECAUSE the slot was never spent), Skip → popup "Archmage 1 took 71 Psychic damage (too healthy to kill)", HP 170→99. `spell_slots_level_9` STILL 1 after second cast.

## Likely Location
- `src/hooks/combat/useSpellMetamagicGates.js:37-79` — `isPowerWordSpell` includes `'power word kill'`; the `setSecondaryTargetModal` branch's `onTargetSelected` (:61-63) and `onSkip` (:74) both call `onExecute(spell, …)` WITHOUT `prepareSpellCast`. `onExecute` here is `castAction` (`src/components/char-sheet/char-spells/CharSpells.jsx:43-45`) = raw `executeSpellCast` (`src/hooks/combat/useSpellCastExecutor.js`), which never spends slots. The slot-spending `prepareSpellCast` block at :113-130 is unreachable for Power Word spells whenever `creatureTargets.length > 0` (any staged combat).
- Effect logic itself (correct): `src/services/rules/spells/spellCastService/execution/modalSpells.js handlePowerWordKill` + `execution/helpers.js:235-289 applyPowerWordKillToTarget` — `currentHp <= 100` → full-HP Psychic applyDamage + `threshold:'dead'` hp_change + "slain" popup; else `rollExpression('12d12')` + popup "(too healthy to kill)". Both verified exact.
- Secondary design note: the app gives Power Word Kill a "choose SECOND target within 10 ft" modal — PWK has no such second-target clause in 2024 spells.json (this is the Twinned-flavored gate built for Power Word Heal being applied to Kill too; skipping it is the only single-target-safe path).
- No `damage`-type roll log entry is written for the 12d12 leg (`applyPowerWordKillToTarget` logs only hp_change + popup) — hp_change delta is the only numeric ground truth.

## Notes
- Same bypass family as bug-sp-088 (identical branch, heal half) and bug-sp-085 (custom confirm bypassing `prepareSpellCast`).
- Class/level data confirmed: lv9, classes Bard/Sorcerer/Warlock/Wizard (Cleric and Druid NOT on the list — Wild_Sage_Druid is NOT a valid caster; DivinationWizard lv20 Wizard is the reusable tester).
- 2024-vs-5e data: 2024 spells.json carries `damage 12d12 @9` and the >100-HP damage clause; legacy 5e spells.json has no damage (pre-2024 "no effect"). The handler implements the 2024 wording for both rulesets.
- Evidence keys: `change-data combatSummary.creatures[Wight 1].currentHp=0`, `[Archmage 1].currentHp=99`, `DivinationWizard.spell_slots_level_9=1` after two casts; log has two `spell` entries + `hp_change -82 threshold:dead` + `hp_change -71`, no `ability_use`.
