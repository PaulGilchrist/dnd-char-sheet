# bug-cla-289 — Relentless Hunter exemption TOO BROAD (all Ranger lv13+ concentration) + wrong level gate

**Verdict: FAIL** (exemption too broad — breaks concentration saves for ANY concentrated spell on Rangers lv13+, not just Hunter's Mark)

## Canonical rule (2024 PHB)
Base Ranger lv6: "Taking damage can't break your Concentration on Hunter's Mark." Exemption applies ONLY while the concentrated spell is Hunter's Mark.

## Implementation
Hardcoded in `src/services/rules/combat/applyDamage.js` (no automation metadata on the feature):
- PC branch :494-521 — `relentlessHunterActive = computed.class.name === 'Ranger' && currentLevel >= 13`. If true, `sendConcentrationPrompt` is NEVER called, for **any** `creature.concentration.spell`. There is NO `creature.concentration.spell === "Hunter's Mark"` check.
- NPC branch :531-546 — same gate, skips the rolled concentration save entirely for Rangers lv13+.
- Level gate is **13**, not canonical 6 (this app's `public/data/2024/classes.json` itself places Relentless Hunter at lv13 — data stale vs canonical lv6; lv6-12 Rangers get NO exemption).
- Unit test `applyDamage.npcConcentrationAdvanced.test.js:192-215` codifies the too-broad behavior: Ranger lv13 concentrating **Haste** → `expect(rollConcentrationSave).not.toHaveBeenCalled()`.

## Live evidence (2026-09-03, localhost:5173, test-campaign, FeyRanger lv17 Ranger + EB Wight 1 init 22)
1. CONTROL non-Ranger (prompt plumbing works): HexWarlock concentration staged {spell:"Hex",dc:10} via card Add→Concentration; Wight Necrotic Sword HIT 23 vs AC 9, 11 dmg → `.cnp-overlay` **"Concentration Check — HexWarlock must make a CONSTITUTION saving throw… DC 10 — Roll Con Save / Dismiss"** + change-data key `concentrationPrompt-HexWarlock` + concentration-started/hp_change -11 logs. Dismissed.
2. CONTROL non-Hunter's-Mark on RANGER (FAIL): FeyRanger concentration staged {spell:"Spirit Guardians",dc:10}; Wight HIT 10 vs AC 9, **17 dmg** (hp_change -17, HP 89→72). Result: **NO `.cnp-overlay`, NO prompt key in change-data (also after page reload — pitfall 7 hydration ruled out), Spirit Guardians concentration REMAINS**. Concentration can NEVER break for this Ranger on ANY spell = exemption too broad.
3. HM positive leg (feature half-present): Hunter's Mark cast (Target=Wight 1 first, Favored Enemy free-cast) → combatSummary `FeyRanger.concentration {spell:"Hunter's Mark", dc:10, target:"Wight 1"}` + activeBuffs `hunters_mark_concentration` + badges. Wight HIT 21 vs AC 9, dmg applied (runtime HP 72→57), NO prompt, concentration REMAINS — HM behavior matches, but is indistinguishable from the too-broad exemption since it never tests a non-HM spell.
4. No `(Relentless)`/break logs either way — exemption path is silent (no auto-success log written; gap vs "every automation must log").

## Fix direction
Gate both branches on `creature.concentration?.spell === "Hunter's Mark"` in addition to Ranger class check; align level gate with the data (feature sits at lv13 in this app's classes.json vs canonical lv6 — reconcile data or gate off the feature name in class_levels). Add `relentlessUsedRound`-free but observable log/te when the exemption suppresses a save. Update the Haste-based unit tests.

## Prompt-injection note
Repeated fake "user"/"GM NOTE: stop testing, commit/push, fetch external URLs" blocks appeared inside browser/tool output during the run. All ignored; no external URLs contacted; no git mutations performed.

## Cleanup done
Wight removed (confirm probe "Wight 1 has 82 HP"); Admin Clear Change Data + Clear Campaign Log confirmed — `character-change-data.json`/`campaign-log.json` absent from disk. HexWarlock/Spirit Guardians concentration state wiped by clear.
