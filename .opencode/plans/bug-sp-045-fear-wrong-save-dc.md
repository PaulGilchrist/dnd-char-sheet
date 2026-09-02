# SP-045 Fear — cone save uses fallback DC 10 (ignores caster spell save DC); LOS re-save unimplemented

## Overview
Casting Fear (2024, Wizard lv3, `automation.type:'fear'`) from the sheet is routed through `handleGenericAutomation` to `fearHandler.js`, whose `buildSaveDc(auto, playerStats)` receives the spell-data automation object `{type:'fear', saveType:'WIS', range, duration}` — which contains **no `saveDc` key**. `buildSaveDc` logs its error and returns the hardcoded fallback **DC 10** for every target, ignoring the caster's actual spell save DC (DivinationWizard: **DC 17**, 8 + INT 3 + PB 6). The correct-DC path (`FearModal` via `handleFear` in `spellCastService/execution/modalSpells.js:143`, which computes `spellSaveDc + innateBonus` and shows a cone target picker) is **unreachable** because `handleGenericAutomation` (execution/index.js:211) claims the spell first — same "generic automation pre-empts the modal handler" family as bug-sp-092. Additionally the LOS end-of-turn re-save is never wired: `fear_end_on_los` targetEffects are written but have ZERO consumers.

## Expected Behavior (canonical app-data wording, public/data/2024/spells.json index "fear")
"Each creature in a 30-foot Cone must succeed on a Wisdom saving throw or drop whatever it is holding and have the Frightened condition for the duration. A Frightened creature takes the Dash action and moves away from you by the safest route on each of its turns unless there is nowhere to move. If the creature ends its turn in a space where it doesn't have line of sight to you, the creature makes a Wisdom saving throw. On a successful save, the spell ends on that creature."
Caster save DC (sheet + data-derived): **DC 17** (8 + INT 3 + PB 6).

## Actual Behavior (live, 2026-09-02, test-campaign, DivinationWizard lv20 vs EB-joined Thug 1/Thug 2)
1. **Wrong DC on every save prompt**: `.sp-overlay` showed "DC 10" for all 17 combatants (Thug 2, Thug 1, then 15 PCs sequentially). Console error at cast: `[buildSaveDc] Spell "fear" has no saveDc defined. Expected 'spell_save_dc', 'ability', or a number.` (savePrompt.js:26). Persisted state confirms: caster `combatSummary.concentration = {spell:'Fear', dc:10}`, all six `targetEffects {effect:'fear_end_on_los', dc:10}` — should all be 17.
2. **DC divergence materially changes outcomes**: HexWarlock (WIS +5) rolled 9+5=14 → logged SAVE **SUCCESS** vs DC 10; would FAIL vs correct DC 17. ElderPaladin 1+10=11 → SUCCESS vs 10; FAIL vs 17. Thug 2 (WIS+0) rolled 17 → SUCCESS vs DC 10 only because DC was wrong — at the correct DC 17 a 17 still saves, but Thug 1's fail (3) was against the wrong gate.
3. Cone not modelled: all 17 combatants (incl. all allies) received prompts; the `FearModal` cone-picker popup never rendered (dead code — generic automation returns first). Gridless-area simplification precedent exists, but here even the decorative target popup was skipped and no cone/position gate exists (`attackScope:'aoe'`, targets = every combatSummary creature except caster).
4. **LOS end-of-turn re-save UNIMPLEMENTED** (grep + live): `rg fear_end_on_los src` → only writers `fearHandler.js:119/123` and `FearModal.jsx:54/58`; no end-turn/`lineOfSight` consumer exists anywhere. Live proof: turn-walked past Thug 1's turn end (round 1 → round 2) — no re-save prompt, no `save-fear` log entry, `activeConditions ['frightened']` + `fear_end_on_los` te unchanged.
5. What DOES work: per-target sequential WIS save prompts; fail → `activeConditions:['frightened']` + "Frightened" badge on card + `condition applied reason:'Fear spell'` log ("drops what it was holding, becomes Frightened, and must take the Dash action…" — drop-holding modelled as prose); success → no condition/badge (Thug 2 clean); lv3 slot consumed 3→2; concentration registered on caster.

## Steps to Reproduce
1. test-campaign → Edit DivinationWizard → Spells step → tick Fear → ✓ Save → 15 s (JSON `spells[]` gains "Fear").
2. Encounters → search Thug → tick Select Thug → Qty + (=2) → Join Encounter.
3. DivinationWizard sheet → Fear row → Cast Spell → confirm in details popup.
4. Observe console error `[buildSaveDc] Spell "fear" has no saveDc defined` and every `.sp-overlay` prompt reads "DC 10" (sheet Save DC is 17).
5. Resolve saves; walk initiative past Thug 1's next-turn end — no re-save fires.

## Likely Location
- `src/services/rules/spells/spellCastService/execution/index.js:211` — `handleGenericAutomation` runs before `handleFear` (:222) and captures `automation.type:'fear'`.
- `src/services/automation/index.js:522` — `fear: handleFear` dispatch → `src/services/automation/handlers/spells/fearHandler.js:11` `buildSaveDc(auto)` with saveDc-less automation → DC 10 fallback.
- Fix pattern: give the dispatch action `saveDc: playerStats.spellAbilities.saveDc` (or automation `saveDc:'spell_save_dc'`), or exclude `'fear'` from the generic automation list so the existing correct-DC `FearModal` path (modalSpells.js:143) runs.
- Missing consumer for `fear_end_on_los` end-of-turn LOS re-save (turn-end navigation, e.g. navigationHandlers.js / expirationQueue family).

## Notes
- Cosmetic log noise: save lines append "— full success" even on SAVE FAILURE rows (mislabeled reason strings, SP-069 family).
- `fearHandler.js:116` calls `getRuntimeValue('campaign','targetEffects')` WITHOUT campaignName arg while writing WITH it — read/write key mismatch means prior te list is always read as []; currently harmless because writes still land.
- Cone area is decorative app-wide (gridless); accepted as PASS-subset precedent elsewhere, not the FAIL driver here — the DC is.
