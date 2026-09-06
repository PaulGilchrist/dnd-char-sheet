# BUG CLA-321 — Soulstitch Spells: chooser/stamp/log live, enforcement ABSENT from the live sheet AoE path (FAIL)

**Date:** 2026-09-05 · **Verdict: FAIL** · Caster: DivinationWizard lv20 2024, subclass re-picked **Abjurer→Evoker** via Edit wizard tab 7 + Fireball added to disk spells[] (PERMANENT).

## Row vs app attribution
- App: `public/data/2024/classes.json` Evoker (2024 Wizard subclass) feature lv6 `{type:'soulstitch_spells', casting_time:'passive'}` — text matches row verbatim. Absent from 5e classes.json.
- Manifest paths (classFeatureHandler/classFeatureRouter/classFeatureInfoBuilder) fictitious. Real chain: `automationInfoBuilder/passive.js:158` → `automationRouter.js:638` (passives) → `spellCastService/execution/savePath.js:13` `triggerSoulstitchSpells` (`postCastRiderService.js:143`) → `soul-stitch-modal-show` → `modals/arcane/SoulstitchSpellsModal.jsx` → `handlers/class-wizard/soulstitchSpellsHandler.js` writes `_<Caster>_Soulstitch_Spells_active`.
- Enforcement consumers of the stamp: `handleNpcSaveDamage.js:79/96/228/259/382/415`, `useLoggedDiceRollEventHandlers.js:62/77/252`, `handleAoeDamage.js:85` (MAP-OVERLAY path), `aoeService.js:68` (overlay NPCs).

## FAIL-1 (core): SaveAttackAoeModal — the ONLY surface sheet AoE casts ever resolve through — never consults the stamp
`SaveAttackAoeModal.resolveAllSavesAndDamage` rolls NPC saves inline (`Math.random`, :104) and its modal-local `handleSaveResult` resolves PC prompts; NEITHER calls `hasSoulstitchProtection`. grep: zero "soulstitch" in `SaveAttackAoeModal.jsx`.
**LIVE (Fireball lv3 paid, DC 17, lv3 3→2):** chooser appeared pre-picker ("Choose up to 4…", maxSelections 1+3 ✓), Thug 1 chosen, stamp `DivinationWizard._DivinationWizard_Soulstitch_Spells_active:["Thug 1"]` + confirm popup "Thug 1 automatically succeed on saves and take no damage." Then picker "Fireball (2)": result popup `Thug 1: Saved — takes 14 Fire damage (rolled 17, halved)`; log `save-damage target:'Thug 1' saveResult:"success" saveRoll:17 finalDamage:14`; change-data Thug 32→18. Chosen creature rolled a NORMAL save and took half damage — both clauses violated on the canonical vehicle. Control unchosen Zombie 1 normal (failure, 30 dmg, hp→0).

## Contrast (proves "consumer exists, wired to wrong paths" — not dead-collection)
Chain Lightning lv6 (app-data SINGLE-target DEX-half, so routes `handleSingleTargetSave`→rollDamage→`handleNpcSaveDamage`) on still-stamped Thug 1, lv6 2→1 paid: log `saveResult:"soulstitch_auto_success" saveRoll:5(=would-fail DC17) finalDamage:0`, NO hp_change (stayed 18), popup "✓ SAVE SUCCESS (0 vs DC 17)". Enforcement exact on this path only.

## Secondary defects (grep + live)
1. **Double-apply:** modal `handleApply` AND `triggerSoulstitchSpells` post-promise both call `applySoulstitchSelection` → duplicate `ability_use` log per cast (live: 2 identical "1 creature(s) chosen…" entries at same second per cast, twice) + redundant POST + garbage key `_<Caster>_Soulstitch_Spells_cast_<Date.now()>` written every apply (never read; dead code `castKey` in handler).
2. **No expiry:** `_..._Soulstitch_Spells_active` has ONE writer, two readers, zero clear anywhere (grep) → chosen creatures stay auto-protected for ALL later saves (live: Chain Lightning on the PREVIOUS cast's stamp). Persists across combats until Admin clear. Feature is per-cast — needs consume-at-cast-resolution or turn expiry.
3. **Cancel deadlock:** `SoulstitchSpellsModal` Cancel → onClose never calls `confirmSoulstitchSelection` → `await confirmationPromise` in `triggerSoulstitchSpells` hangs → AoE picker never opens, slot already paid (grep-proven; not live-tested to avoid stranding cast).
4. **Scope divergence:** chooser eligible = ALL combatSummary creatures incl. caster ("DivinationWizard" listed, self selectable); row says "other creatures you can see" — no visibility filter, self allowed.
5. Popup/log roll mismatch on enforced path: popup "(d20 1 + 0)" vs log `saveRoll:5`.
6. Result-confirm popup renders UNDER the immediately-opening AoE picker (z-order race, `soulstitch-modal-show` fires before `saveAttackAoe` setModalState) — needed a Done-dismiss cycle mid-flow.

## Correct clause evidence (partial)
Trigger scoping exact: non-Evocation casts never open chooser (Magic Missile etc skipped in flow); lv3 cap 4, lv6 cap 7 rendered "Choose up to N" 1+slot ✓; stamp+log fire every qualifying cast; single-target save auto-success/0-damage math exact.

## Fix direction
Forward stamp consumption into `SaveAttackAoeModal.resolveAllSavesAndDamage` (NPC branch: skip roll, success=true, finalDamage=0, saveResult 'soulstitch_auto_success', log suffix "(Soulstitch)") + modal-local `handleSaveResult` PC branch; consume/clear stamp after cast resolution; dedupe apply (modal OR trigger, not both); drop castKey; resolve onCancel (empty selection = decline, no stamp, keep picker).
