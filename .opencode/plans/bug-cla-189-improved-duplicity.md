# Bug CLA-189 — Improved Duplicity (Enhanced Distraction): granted ally Advantage never applied to ally attack rolls

## Overview
Trickery Domain lv17 Cleric (2024). Activating "Invoke Duplicity" correctly detects Improved Duplicity: the buff is created with `isImprovedDuplicity: true`, Channel Divinity is consumed (3→2→1 at lv17), the "Improved Duplicity — Choose Allies" picker appears, and `invokeDuplicityAdvantageTargets` is stored with a log entry "Divine_Cleric used Improved Duplicity, granting Advantage to War_Cleric." The **Healing Illusion half works exactly** (+17 HP on illusion end). But the **Enhanced Distraction half for allies is never applied**: an attack roll by the chosen ally against a creature resolves as a normal single-d20 roll. The automation advertises the advantage (picker + log) but no PC attack-roll consumer exists.

## Expected
Per manifest/feature text: "when you **and your allies** make attack rolls against a creature within 5 feet of the duplicate illusion, those attacks have Advantage." A chosen ally's (War_Cleric) attack roll should show ADVANTAGE (two d20, mode: advantage).

## Actual
- Caster's (Divine_Cleric) own attack: rolls two d20 with "Advantage" flag ("d20 18, 3 → 18 +8 ✓ HIT 26 vs AC 14") — BUT this comes from the base Invoke Duplicity branch (`contextBuilder-sync.js:475` checks only `effect === 'create_illusion'`, ignoring `isImprovedDuplicity` and the 5-ft condition), so it is not the Improved feature working.
- Granted ally's (War_Cleric, explicitly ticked in the picker + logged) attack: popup "Guiding Bolt — d20 9 +1 ✗ MISS (10 vs AC 14)" single d20, log entry `rolls:[9], mode:"normal"` — NO Advantage. `invokeDuplicityAdvantageTargets` is stored on the caster but never read by any PC attack roll path.

## Steps to Reproduce
1. test-campaign: lv17 Trickery Domain Cleric (Divine_Cleric) + Wight joined via Encounter Builder.
2. On cleric's turn: sheet "Invoke Duplicity:" row → CD consumed, buff `create_illusion` w/ `isImprovedDuplicity:true` → picker "Improved Duplicity — Choose Allies" → tick War_Cleric → **Grant Advantage (1)** (log entry written, runtime key stored).
3. Open War_Cleric sheet (or any granted ally), set initiative card Target = Wight 1, click its attack dice link.
4. Roll popup: single d20, no Advantage; change-data log `mode:"normal"`.

## Likely Location
- `src/services/automation/contextBuilder-sync.js:496-515` — the no-map duplicity check calls `getDuplicityAdvantageAgainst({ attackerName, campaignName, skipRangeCheck })` but `duplicityAuraUtils.js:4` destructures `{ attackerName, mapData }` → `mapData` is always `undefined` → returns `{ advantage: false }` (dead call). Same bug in `src/services/automation/contextBuilder-map.js:111`.
- No consumer anywhere reads `invokeDuplicityAdvantageTargets` for PC attack rolls (only `MonsterCardModal.jsx:265-276,374`, which grants advantage to the **monster's own** attack when the monster name is in the list — inverted semantics).
- Fix direction: in the PC attack context builder (contextBuilder-sync.js, like the `distracting_strike_advantage` block at :526-540), scan party clerics for `activeBuffs` with `effect:'create_illusion' && isImprovedDuplicity` and, if target ∈ that cleric's `invokeDuplicityAdvantageTargets`, force `mode='advantage'` (or fix the mapData argument and enforce 5-ft via token positions).

## Notes
- Manifest says lv6; app data puts Improved Duplicity at **lv17** (2024 classes.json Trickery majors) — manifest stale, not a bug.
- Manifest handler/router paths are stale; real impl is combatStanceHandler + CharActionModals + duplicityAuraUtils + contextBuilder-sync/map.
- Healing Illusion verified EXACTLY: re-click "Invoke Duplicity:" while buff active → "Healing Illusion" modal "regain 17 HP" → radio Divine_Cleric → Heal → log `hp_change delta:+17, 95→112, sourceName Invoke Duplicity`, buffs cleared.
- Casters own-advantage at :475 also ignores the "within 5 feet" restriction (cosmetic/rules-precision issue on the same feature).
