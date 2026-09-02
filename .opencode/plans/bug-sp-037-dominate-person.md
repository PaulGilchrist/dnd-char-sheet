# Bug SP-037 — Dominate Person: no repeat Wisdom save on damage; Charmed ends unconditionally on first damage

## Overview

SP-037 Dominate Person triggers correctly: single-target Humanoid gate, WIS save prompt at the correct caster DC (17), Charmed condition applied + badged on failed save, concentration tracked, lv5 slot consumed, and full log trail. **But the core "repeats the save whenever it takes damage" clause is not implemented.** The first instance of damage strips the Charmed condition immediately with no saving throw at all (no `.sp-overlay` prompt, no save roll, no `save_result` log), ending the domination outright. Secondary: the caster's concentration entry survives the effect ending, and the damage-break log carries a wrong reason label ("Animal Friendship").

## Expected Behavior (canonical app-data wording, `public/data/2024/spells.json` → Dominate Person)

> "One Humanoid you can see within range must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target has Advantage on the save if you or your allies are fighting it. **Whenever the target takes damage, it repeats the save, ending the spell on itself on a success.**"

Manifest note: manifest calls it a "6th-level enchantment" but BOTH app data files (`public/data/2024/spells.json` and `public/data/spells.json`) define it as **level 5**, classes Bard/Sorcerer/Wizard — app data was used as ground truth (level 5, 5e is also 5th level; manifest wording is stale).

## Actual Behavior

- Initial cast chain works exactly right (see Evidence).
- After a Fire Bolt hit dealing 19 damage to the Charmed Thug 1: **no repeat WIS save prompt appeared** (overlay list after Done contained only the damage popup). `Thug 1.activeConditions` went `["charmed"] → []` instantly, removed by the generic damage handler WITHOUT any save roll.
- Log shows only `condition removed — reason: "took damage (Animal Friendship)"` (mislabeled) — zero save rolls after the damage.
- Caster `combatSummary.DivinationWizard.concentration = {spell:'Dominate Person', dc:10}` PERSISTS after the charm ended (residual-flag family CLA-175/191/194).
- Advantage-on-save condition is a wrong proxy: `dominatePersonService.js:70-73` grants save Advantage if `currentHp < maxHp` ("full health check"), not "you or your allies are fighting it".

## Grep / control evidence (no consumer exists)

- `rg -n "dominat" src/services/rules/combat/applyDamage.js` → **zero matches** — applyDamage has no dominate-aware branch.
- `applyDamage.js:333-347` (PC branch) and `:360-374` (NPC branch): on any `wardDamage > 0`, any `charmed` condition is filtered out of `activeConditions` unconditionally and logged `reason: 'took damage (Friends)'` / `'took damage (Animal Friendship)'`. This is the path that ate the domination.
- `rg -n "dominate_person|dominated" src` (non-test) → consumers are only: `automation/index.js:545` (dispatch), `triggerSpells.js:306` (cast trigger), `initiative.jsx:417-425` (clear on initiative roll), `clearExpirationEffects.js:280` (`dominated` → remove charmed). **No damage-triggered repeat-save consumer anywhere.** The live damage-break produced no save prompt, confirming the static finding.

## Steps to Reproduce

1. test-campaign → Edit DivinationWizard (lv20 Wizard, Save DC 17) → Spells step → dismiss `.mi-skip` → tick `Dominate Person` (unprepare one spell first, prepared cap 25/25) → ✓ Save → 15 s (JSON gained spell).
2. Encounters → tick `input[aria-label="Select Thug"]` → `.encounter-btn-join` (Thug = Humanoid, HP 32, AC 11, WIS +0).
3. Initiative → DivinationWizard card Target select = `Thug 1` (native setter + change).
4. Sheet → spell row `Dominate Person` → popup shows Level 5 / 60 feet / Action / Concentration, up to 1 minute → **Cast Spell**.
5. Result popup: "Thug 1 failed WIS save (DC 17). Roll: 16 + 0 = 16 — Thug 1 is Charmed". Dismiss residual `.sp-overlay` via `.sp-dismiss-btn` + Done.
6. Initiative card shows **Charmed** badge; change-data: `Thug 1.activeConditions:["charmed"]`, concentration `{spell:'Dominate Person'}`, lv5 slot decremented.
7. Re-set Target = Thug 1 → sheet Fire Bolt → Cast Spell → HIT 13 vs AC 11 → Done → damage popup "19 damage applied — HP: 32 → 13".
8. **Bug:** no `.sp-overlay` WIS re-save prompt ever appears; after debounce `Thug 1.activeConditions:[]` — domination silently over with no saving throw.

## Likely Location

- `src/services/rules/combat/applyDamage.js:333-347, :360-374` — generic unconditional charmed-removal-on-damage fires for dominated targets; a dominate-person repeat-save branch (queue save prompt, keep charmed on failure, end concentration on success) is missing here.
- `src/services/rules/features/dominatePersonService.js:70-73` — advantage proxy "target at less than full health" instead of "you or allies are fighting it".
- `src/services/automation/handlers/spells/dominateHandler.js` — applies charmed + `dominated` expiration but registers no damage-trigger save; concentration not cleaned when condition clears.

## Notes

- Live-probed PASS parts: cast trigger, Humanoid gate (Thug accepted; non-humanoid refund path exists at service :52-68), WIS DC 17 exact (8+PB6+INT3), auto-rolled NPC save from combatSummary, Charmed badge + tooltip, `save-dominate-person` save_result logs, lv5 slot consumption, concentration write.
- Manifest level attribution ("6th") is stale vs app data (5th) — do not re-level casters for it.
- Cleanup state: Thug removed, change-data + campaign log cleared after run; DivinationWizard keeps Dominate Person permanently prepared (registry updated).
