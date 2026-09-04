# BUG SP-097 — Ray of Enfeeblement (2024): fallback DC 10, target "Unknown", no repeat save

**Verdict: FAIL** (2026-09-03, DivinationWizard lv20 vs EB Thug 1, test-campaign)

## Canonical (public/data/2024/spells.json, confirmed)
Lv2 Warlock/Wizard, Action, 60 ft, Concentration 1 min. Target CON save.
Success = Disadvantage on NEXT attack roll until start of caster's next turn.
Fail = Disadvantage on STR-based d20 tests + subtract 1d8 from all damage rolls; repeats CON save at end of each of its turns, ends on success.

## Defect 1 — Save DC always fallback 10 (SP-045 family, CONFIRMED live)
- `src/services/rules/features/rayOfEnfeeblementService.js:4-11` builds `action.automation = { type, targetName }` — NO `saveDc`, even though `spellSaveDc` is in scope at `spellCastService/execution/triggerSpells.js:319` (`{ ...metaCtx, spellSaveDc, targetName }`) and never threaded into `automation`.
- `rayOfEnfeeblementHandler.js:12` `buildSaveDc(auto, playerStats)` → `savePrompt.js:26` console.error + **return 10**.
- LIVE: caster sheet Save DC 17 (INT 17 +3, lv20 PB +6); `.sp-overlay` prompt rendered "CON saving throw … **DC 10**"; console error `[buildSaveDc] Spell "ray_of_enfeeblement" has no saveDc defined.`; change-data caster `concentration.dc: 10`.
- Fix pattern: pass `saveDc: 'spell_save_dc'` (or the numeric `spellSaveDc`) through the service into `automation` (mirror holdMonsterService per SP-066 fix).

## Defect 2 — Target never resolved: debuff lands on "Unknown" (CONFIRMED live)
- `src/components/char-sheet/char-spells/CharSpells.jsx:41` passes `getTargetInfo = async () => null` into `useSpellCastExecutor` — the Spells-table cast flow (the ONLY surface for this spell; damage-null so it never enters the Actions grid) can never resolve a target, regardless of the initiative-card Target dropdown.
- `triggerSpells.js:317-319` `getTargetInfo()` → null → `targetName 'Unknown'` → handler prompt "Unknown must make a CON saving throw" (rolled `d20 (9) + 0` — Thug's CON +2 never used).
- LIVE with wizard card Target=Thug 1 armed (`combatSummary.creatures[DivinationWizard].targetName === 'Thug 1'` verified in change-data): te written as `{ target: "Unknown", effect: 'ray_of_enfeeble_debuff', … }`; logs "casts Ray of Enfeeblement on **Unknown**".
- Downstream inert: Thug Mace vs wizard = single d20 (no disadvantage), damage "1d6 + 2: 4 +2 = 6 damage applied HP 82 → 76" full, no "-1d8 [Enfeeblement]" line (`handlePlainDamage.js:58-63` keyed by attacker name ≠ 'Unknown' never fires). Success-branch `disadvantage_next_attack` would equally target 'Unknown'.

## Defect 3 — No end-of-turn repeat save consumer (SP-066 family)
- `isRayOfEnfeeblementActive` (`rayOfEnfeeblementHandler.js:171`) exported via `automation/index.js:624` — **zero consumers** app-wide (grep).
- Enfeeblement badge `ConditionEffectBadges.jsx:251-254` has no `onClick: onRollConditionSave` (contrast Otto/Tasha/Maze/Confusion/Forcecage badges at :363-:408); no `activeConditionMeta` written by handler, so no clickable repeat-save badge exists.
- No turn-end/navigation consumer references `ray_of_enfeeble_debuff`.
- LIVE: walked full round (round 2) past Thug 1 — te unchanged, `.sp-overlay`/`.cnp-overlay` never appeared on its turn, zero 'Repeat Save' roll log entries. Canonical "repeats the save at the end of each of its turns" is entirely unimplemented.

## What works
- Data correct (lv2, CON save, concentration). Handler chain live: cast → save prompt → fail branch writes registry te `ray_of_enfeeble_debuff` (existing key, targetEffectDefinitions.js:524) + condition-applied log + caster concentration record. Caster concentration-break prompt + `clearRayOfEnfeeblementEffects` (concentrationService.js:84) wired. Consumers for STR check/skill disadvantage (`d20RollComputation.js:56-71`, check/skill only) and −1d8 damage (`handlePlainDamage.js:58-63,83` + DiceRollResult.jsx:258) exist and would work IF the te targeted the real creature.

## Cleanup state
Thug 1 removed, Admin Clear Change Data + Campaign Log executed (disk-absence truth). DivinationWizard keeps Ray of Enfeeblement prepared (fillers Nondetection/Arcane Lock removed to respect 25 max prepared); lv2 slots consumed by test casts — rest restores.
