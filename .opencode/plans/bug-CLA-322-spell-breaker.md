# Bug CLA-322 — Spell Breaker (2024 Wizard / Abjurer lv10) — FAIL

## Verdict
FAIL — clause 2 (Dispel Magic bonus-action cast + proficiency-bonus ability check) is never observable and its math double-counts PB; clause 3's Dispel branch refund is unreachable (no producer). Clause 1 and clause 3's Counterspell branch verified live.

## Feature row
CLA-322: "Always have Counterspell + Dispel Magic prepared; Dispel Magic cast as BONUS action with +Proficiency Bonus added to the ability check; when casting either spell with a spell slot, the slot is NOT expended if the spell fails to stop a spell."
Data: `public/data/2024/classes.json` [11]Wizard → majors[0]Abjurer → features[4] "Spell Breaker" level 10 (canonical 2024 Abjuration lv10 ✓ — NOT Evocation). automation: passive_rule/spell_breaker with alwaysPreparedSpells, bonusActionSpells [Dispel Magic], dispelAbilityCheckBonus proficiency_bonus, slotRetentionSpells [Counterspell, Dispel Magic].

## Test rig
DivinationWizard lv20 2024 Human Sage (INT 17 +3, PB +6) re-subclassed Evoker→Abjurer via Edit wizard tab "7 Subclass / Major" + ✓Save (no mi-overlay), disk confirmed, page reload. EB Gazer 1 joined (Join Encounter), Frost Ray cast vs AasimarTest producing lastAttack (`attackName:'3. Frost Ray'`, saveType Dexterity).

## Clause results

### Clause 1 auto-prepare — PASS (live)
After subclass edit + reload: "Wizard (abjurer), Level 20" header; Counterspell (NOT on disk `spells[]`) renders clickable in Reactions grid (injected `{prepared:'Always'}` via spellCalc2024.js:322 + CharReactions reaction-spell grid); Spell Breaker feature text in Special Actions. Caveat: Dispel Magic (already on disk) row keeps blank Prepared cell + "Action" time — injection skips existing entries without stamping Always (cosmetic, spell castable either way in this app's 2024-wizard model).

### Clause 2 bonus action + PB on dispel check — FAIL
1. **Casting time never converts in UI**: SpellDetailPopup for Dispel Magic displays "Casting Time: Action" and spells-table row Time cell "Action". The flip to '1 bonus action' (spellPreparationService.js:766-772) mutates `modifiedSpell` internally AFTER cast; no surface ever shows Bonus Action (popup reads base `spell.casting_time` SpellDetailPopup.jsx:154).
2. **No ability check exists**: `triggerDispelMagic` (spellCastService/execution/helpers.js:120-150) rolls no d20, prompts nothing, and dispatches a `spell-result` CustomEvent whose only listener is the refund helper (which ignores it — no `checkFailed`). Zero consumers of `isDispelMagic` events (grep). Cast produced only `spell` log + Arcane Ward ability_use; no save_result/check log, no popup.
3. **Wrong math even where computed**: helpers.js:133 `totalCheckBonus = abilityMod + profBonus + (metaCtx?.dispelAbilityCheckBonus||0)` while SpellDetailPopup.jsx:118-120 already sets `dispelAbilityCheckBonus = profBonus` → **PB double-counted**: 3+6+6=+15 vs row/canonical mod+PB=+9.
4. Collateral: Counterspell CON-save DC fell back to 10 with console error `[buildSaveDc] Spell "reaction_counterspell" has no saveDc defined` (should be caster spell-save DC 17 under the app's save model).

### Clause 3 slot-not-expended on failure — MIXED
- **Counterspell branch PASS (live ×2)**: cast paid lv3 3→2 (popup "Slots Remaining: 3"), Gazer CON save succeeded 22 vs DC 10 → log "Counterspell fails to counter '3. Frost Ray'." → `counterSpellHandler.js:148-157` refunded lv3 2→3 (change-data confirmed twice). No refund log entry (silent state write — violates house "every automation must log"). Refund key hardcoded `spell_slots_level_3` (upcast leak latent). No reaction-spent gate: repeat click re-triggers vs same lastAttack (each pay+refund cycle).
- **Dispel branch FAIL**: refund only via `setupSpellBreakerDispelRetention` listener on `spell-result` with `checkFailed===true` — **no producer of checkFailed exists anywhere** (grep: sole `spell-result` dispatcher is triggerDispelMagic, never sets it). Live dispel cast paid lv3 3→2, nothing resolved, no refund — slot always consumed regardless of outcome. `refundSpellBreakerSlot` exported but zero prod callers.

## Canonical vs row
- Canonical 2024 Abjurer lv10 Spell Breaker matches row wording. Canonical Counterspell 2024 app data models it as attacker CON save (no save in printed RAW; auto-counter ≤lv3 / ability check ≥lv4) — app-specific model accepted by precedent; row stays silent on mechanism.
- Row "casting time shows bonus action": canonical expects user-visible bonus action; app converts state only — divergent (FAIL).
- Row refund "if spell fails to stop a spell": counterspell side maps to save-success refund ✓; dispel side unimplementable in app because the dispel check itself never resolves.

## Fix pointers
- Render bonus-action conversion in spells table row + SpellDetailPopup casting time when passive held (or stamp modifiedSpell onto display path pre-cast).
- Produce a real ability-check flow for Dispel Magic (roll d20+mod+PB vs DC 10+targetSpellLevel, log check + set/clear, dispatch `spell-result` with `checkFailed` or resolve inline refund via `refundSpellBreakerSlot`).
- Remove double-count: helper must not add profBonus when metaCtx.dispelAbilityCheckBonus===proficiency_bonus.
- Add `saveDc:'spell_save_dc'` to Counterspell automation data (data fix, no console-error fallback DC 10).
- Log refund events; key refund by cast slot level, not hardcoded 3.

## Grep evidence (inert/missing)
- `checkFailed`: readers helpers.js:77; writers: none.
- `refundSpellBreakerSlot`: definition + re-exports only; zero call sites.
- `spell-result` listeners: only helpers.js:87 retention helper; no popup/log consumer.
- `reaction_counterspell` in automationRouter: no case → default→specialActions; no bold-row producer (grid-cast path dispatches via executor, works).
